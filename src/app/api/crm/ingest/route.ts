import { timingSafeEqual } from 'node:crypto';
import { ingestSiteEvent } from '@/lib/crm/site-events';
import { leadDetails } from '@/lib/crm/leads';

function field(data: object, key: string, length: number) {
  const value = (data as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim().slice(0, length) : '';
}

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function authorized(source: string, header: string | null) {
  try {
    const keys: unknown = JSON.parse(process.env.CRM_INGEST_KEYS || '{}');
    if (!object(keys) || !Object.hasOwn(keys, source) || typeof keys[source] !== 'string' || keys[source].length < 32) return false;
    const expected = Buffer.from('Bearer ' + keys[source]);
    const presented = Buffer.from(header || '');
    return presented.length === expected.length && timingSafeEqual(presented, expected);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const source = request.headers.get('x-crm-source')?.trim().toLowerCase() || '';
  if (!/^[a-z0-9.-]{1,253}$/.test(source) || !authorized(source, request.headers.get('authorization'))) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: 'Evento inválido' }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 32768) {
      await reader.cancel();
      return Response.json({ error: 'Evento demasiado grande' }, { status: 413 });
    }
    chunks.push(chunk.value);
  }
  let data: unknown;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return Response.json({ error: 'Evento inválido' }, { status: 400 });
  }
  if (!object(data)) return Response.json({ error: 'Evento inválido' }, { status: 400 });
  const id = field(data, 'id', 129);
  const name = field(data, 'name', 65);
  const path = field(data, 'path', 512).split(/[?#]/)[0];
  const campaign = field(data, 'campaign', 120);
  if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(id) || !/^[a-z][a-z0-9_]{0,63}$/.test(name) || (path && !path.startsWith('/'))) {
    return Response.json({ error: 'Evento inválido' }, { status: 400 });
  }
  const input = data.lead;
  if (name === 'lead_submitted' && (!object(input) || !field(input, 'name', 150))) {
    return Response.json({ error: 'Lead inválido' }, { status: 400 });
  }
  const lead = name === 'lead_submitted' && object(input) ? {
    name: field(input, 'name', 150), email: field(input, 'email', 254).toLowerCase(),
    phone: field(input, 'phone', 80), country: field(input, 'country', 80),
    city: field(input, 'city', 120), state: field(input, 'state', 120),
    form: field(input, 'form', 120) || source,
    details: object(input.details) ? leadDetails(input.details) : {},
    automate: input.automate !== false,
  } : undefined;
  const accepted = await ingestSiteEvent({ source, id, name, path, campaign }, lead);
  return Response.json({ accepted }, { status: accepted ? 201 : 200 });
}

import assert from 'node:assert/strict';
import { crm } from '@/lib/crm/db';
import { POST } from '@/app/api/crm/ingest/route';
import { recentSiteEvents } from '@/lib/crm/site-events';

async function main() {
  if (!process.env.LMS_TEST_SCHEMA) throw new Error('Usa npm run test:lms para aislar los datos');
  const origin = 'www.cluster.marketing';
  const next = 'sitio.example.test';
  const token = 'token-de-prueba-exclusivo-para-este-script';
  const alternateToken = token + '-2';
  process.env.CRM_INGEST_KEYS = JSON.stringify({ [origin]: token, [next]: alternateToken });
  process.env.CRM_OPERATIONS_ENABLED = 'false';
  const payload = { id: 'ingest-test-1', name: 'lead_submitted', path: '/contacto?a=123', lead: { name: 'Contacto QA', email: 'crm-ingest@example.test', form: 'contacto' } };
  const request = (source: string, key: string, body: unknown = payload) => POST(new Request('https://academia.example.test/api/crm/ingest', {
    method: 'POST', headers: { 'x-crm-source': source, authorization: 'Bearer ' + key }, body: JSON.stringify(body),
  }));
  assert.equal((await request(next, token)).status, 401);
  assert.equal((await request(origin, token, { ...payload, lead: undefined })).status, 400);
  assert.equal((await request(origin, token)).status, 201);
  assert.equal((await request(origin, token)).status, 200);
  assert.equal((await request(next, alternateToken, { ...payload, name: 'page_view', lead: undefined })).status, 201);
  const sql = await crm();
  const leads = await sql`SELECT s.details, e.page_path FROM form_submits s
    JOIN contacts c ON c.id = s.contact_id
    JOIN crm_site_events e ON e.source_site = ${origin} AND e.event_id = ${payload.id}
    WHERE c.email = 'crm-ingest@example.test'`;
  assert.equal(leads.length, 1);
  assert.equal(JSON.parse(leads[0].details).source_site, origin);
  assert.equal(leads[0].page_path, '/contacto');
  const counts = await recentSiteEvents();
  assert.equal(counts.find((group) => group.source_site === origin)?.total, 1);
  assert.equal(counts.find((group) => group.source_site === next)?.total, 1);
  console.log('OK Ingesta autenticada, reintentos sin duplicados y eventos separados por sitio');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

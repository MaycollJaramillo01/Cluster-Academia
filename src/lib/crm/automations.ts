import { crm } from './db';
import { deliverEmail, deliverWhatsapp } from './deliver';
import type { AutomationStep } from './types';

type Person = { id: string; name: string; email: string; phone: string | null };
type Flow = { id: string; name: string; steps: AutomationStep[] };

function parseWait(detail: string) {
  const clean = detail.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const amount = Number(clean.match(/\d+/)?.[0] || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (clean.includes('dia')) return amount * 24 * 60;
  if (clean.includes('hora')) return amount * 60;
  return amount;
}

async function person(id: string): Promise<Person | null> {
  const sql = await crm();
  const rows = await sql`SELECT id, name, email, phone FROM contacts WHERE id = ${id}`;
  const row = rows[0] as { id?: string; name?: string; email?: string; phone?: string | null } | undefined;
  if (!row?.id || !row.email) return null;
  return { id: row.id, name: row.name || '', email: row.email, phone: row.phone || null };
}

async function activeFlows(): Promise<Flow[]> {
  const sql = await crm();
  const rows = await sql`SELECT id, name, steps FROM automations WHERE status = 'activa'`;
  return rows.map((row) => {
    const entry = row as { id?: string; name?: string; steps?: unknown };
    let steps: AutomationStep[] = [];
    try {
      const parsed = JSON.parse(String(entry.steps || '[]')) as AutomationStep[];
      if (Array.isArray(parsed)) steps = parsed;
    } catch {
      steps = [];
    }
    return { id: String(entry.id), name: String(entry.name || 'Automatización'), steps };
  });
}

async function applyTag(contactId: string, name: string) {
  const tag = name.trim();
  if (!tag) return;
  const sql = await crm();
  const existing = await sql`SELECT id FROM tags WHERE name = ${tag}`;
  let tagId = String((existing[0] as { id?: string } | undefined)?.id || '');
  if (!tagId) {
    tagId = crypto.randomUUID();
    await sql`INSERT INTO tags (id, name) VALUES (${tagId}, ${tag}) ON CONFLICT (name) DO NOTHING`;
    const again = await sql`SELECT id FROM tags WHERE name = ${tag}`;
    tagId = String((again[0] as { id?: string } | undefined)?.id || tagId);
  }
  await sql`INSERT INTO contact_tags (contact_id, tag_id) VALUES (${contactId}, ${tagId}) ON CONFLICT DO NOTHING`;
}

async function processJob(job: { id: string; automation_id: string; contact_id: string; step_index: number }, flows: Flow[]) {
  const sql = await crm();
  const flow = flows.find((item) => item.id === job.automation_id);
  const contact = await person(job.contact_id);
  let index = job.step_index;
  while (flow && contact && index < flow.steps.length) {
    const step = flow.steps[index];
    const minutes = step.kind === 'espera' ? parseWait(step.detail) : 0;
    if (step.kind === 'etiqueta') await applyTag(contact.id, step.detail);
    if (step.kind === 'email') {
      // Resend retiene la clave por 24 h. Fuera de esa ventana hace falta conciliación.
      const attempt = await sql`
        UPDATE automation_jobs SET first_attempt_at = COALESCE(first_attempt_at, now())
        WHERE id = ${job.id} AND (first_attempt_at IS NULL OR first_attempt_at > now() - interval '23 hours')
        RETURNING id
      `;
      if (!attempt.length) {
        await sql`UPDATE automation_jobs SET needs_review = true, failed_at = now(), claimed_at = NULL WHERE id = ${job.id}`;
        return false;
      }
      if (!(await deliverEmail(contact.email, flow.name, `Hola ${contact.name},\n\n${step.detail}\n`, undefined, undefined, `crm-automation/${job.id}/${index}`))) {
        throw new Error('Falló el envío de correo de la automatización');
      }
    }
    if (step.kind === 'whatsapp' && contact.phone) {
      // Una interrupción tras enviar deja el trabajo para revisión, porque el proveedor no deduplica este envío.
      await sql`UPDATE automation_jobs SET needs_review = true WHERE id = ${job.id}`;
      if (!(await deliverWhatsapp(contact.phone, step.detail))) throw new Error('Falló el envío de WhatsApp de la automatización');
    }
    index += 1;
    await sql`
      UPDATE automation_jobs SET step_index = ${index}, failed_at = NULL, needs_review = false, first_attempt_at = NULL,
        run_at = now() + ${minutes} * interval '1 minute',
        claimed_at = CASE WHEN ${minutes > 0} THEN NULL ELSE claimed_at END
      WHERE id = ${job.id}
    `;
    if (minutes > 0) return true;
  }
  await sql`UPDATE automation_jobs SET done_at = now(), claimed_at = NULL, failed_at = NULL WHERE id = ${job.id}`;
  return true;
}

export async function queueAutomations(contactId: string) {
  const sql = await crm();
  for (const flow of await activeFlows()) {
    if (!flow.steps.length) continue;
    await sql`
      WITH run AS (
        INSERT INTO automation_runs (automation_id, contact_id)
        SELECT ${flow.id}, id FROM contacts WHERE id = ${contactId} AND email <> ''
        ON CONFLICT DO NOTHING
        RETURNING automation_id, contact_id
      )
      INSERT INTO automation_jobs (id, automation_id, contact_id, step_index, run_at)
      SELECT ${crypto.randomUUID()}, automation_id, contact_id, 0, now() FROM run
    `;
  }
}

export async function processDue(limit = 20) {
  const sql = await crm();
  const jobs = await sql`
    SELECT id FROM automation_jobs
    WHERE done_at IS NULL AND NOT needs_review AND run_at <= now()
      AND (claimed_at IS NULL OR claimed_at < now() - interval '10 minutes')
    ORDER BY run_at, id
    LIMIT ${limit}
  `;
  if (!jobs.length) return 0;
  const flows = await activeFlows();
  let ran = 0;
  for (const job of jobs) {
    const [taken] = await sql`
      UPDATE automation_jobs SET claimed_at = now()
      WHERE id = ${job.id} AND done_at IS NULL AND NOT needs_review AND run_at <= now()
        AND (claimed_at IS NULL OR claimed_at < now() - interval '10 minutes')
      RETURNING id, automation_id, contact_id, step_index
    `;
    if (!taken) continue;
    try {
      if (await processJob(taken as { id: string; automation_id: string; contact_id: string; step_index: number }, flows)) ran += 1;
    } catch {
      await sql`
        UPDATE automation_jobs SET failed_at = now(), run_at = now() + interval '5 minutes', claimed_at = NULL
        WHERE id = ${taken.id}
      `;
    }
  }
  return ran;
}

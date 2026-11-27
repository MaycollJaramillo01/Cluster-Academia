import { createHash } from 'node:crypto';
import { crm } from './db';
import { queueAutomations } from './automations';

type Event = { source: string; id: string; name: string; path: string; campaign: string };
type Lead = { name: string; email: string; phone: string; country: string; city: string; state: string; form: string; details: Record<string, string>; automate: boolean };

export async function ingestSiteEvent(event: Event, lead?: Lead) {
  const sql = await crm();
  const submissionId = 'site:' + createHash('sha256').update(event.source + ':' + event.id).digest('hex');
  const [result] = await sql`
    WITH event AS (
      INSERT INTO crm_site_events (source_site, event_id, event_name, page_path, campaign)
      VALUES (${event.source}, ${event.id}, ${event.name}, ${event.path}, ${event.campaign})
      ON CONFLICT (source_site, event_id) DO NOTHING
      RETURNING event_id
    ), contact AS (
      INSERT INTO contacts (id, name, email, phone, country, city, state, source)
      SELECT ${crypto.randomUUID()}, ${lead?.name ?? ''}, ${lead?.email ?? ''}, ${lead?.phone || null},
        ${lead?.country || null}, ${lead?.city || null}, ${lead?.state || null}, ${lead?.form ?? ''}
      FROM event WHERE ${Boolean(lead?.email.includes('@'))}
      ON CONFLICT (email) DO UPDATE SET phone = COALESCE(contacts.phone, EXCLUDED.phone),
        country = COALESCE(contacts.country, EXCLUDED.country), city = COALESCE(contacts.city, EXCLUDED.city),
        state = COALESCE(contacts.state, EXCLUDED.state)
      RETURNING id
    ), submission AS (
      INSERT INTO form_submits (id, form_name, name, email, phone, country, details, contact_id)
      SELECT ${submissionId}, ${lead?.form ?? ''}, ${lead?.name ?? ''}, ${lead?.email || 'sin-correo'},
        ${lead?.phone || null}, ${lead?.country || null}, ${lead ? JSON.stringify({ ...lead.details, source_site: event.source }) : null},
        (SELECT id FROM contact)
      FROM event WHERE ${Boolean(lead)}
      RETURNING id
    )
    SELECT COALESCE((SELECT id FROM contact), (SELECT contact_id FROM form_submits WHERE id = ${submissionId})) AS contact_id,
      EXISTS (SELECT FROM event) AS accepted
  `;
  if (result?.contact_id && lead?.automate && process.env.CRM_OPERATIONS_ENABLED === 'true') {
    await queueAutomations(String(result.contact_id));
  }
  return result?.accepted === true;
}

export async function recentSiteEvents() {
  const sql = await crm();
  return sql`SELECT source_site, event_name, count(*)::int AS total
    FROM crm_site_events WHERE received_at >= now() - interval '30 days'
    GROUP BY source_site, event_name ORDER BY source_site, total DESC, event_name`;
}

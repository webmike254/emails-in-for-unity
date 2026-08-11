// GET /api/admin/resend-domains
// Reads your Resend domains and their verification status/records so we can see
// exactly what Resend needs on unity-software.online. Gated by the setup secret.
//
//   curl "https://<app>/api/admin/resend-domains" -H "x-setup-secret: <SETUP_SECRET>"
//
import { json } from '../_lib/http.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const secret = process.env.SETUP_SECRET;
  if (!secret || req.headers['x-setup-secret'] !== secret) {
    return json(res, 401, { error: 'Missing or invalid x-setup-secret header.' });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return json(res, 500, { error: 'RESEND_API_KEY is not set.' });

  try {
    const list = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` }
    });
    const listBody = await list.json().catch(() => ({}));
    if (!list.ok) return json(res, list.status, { ok: false, status: list.status, error: listBody.message || listBody });

    const domains = [];
    for (const d of listBody.data || []) {
      const detail = await fetch(`https://api.resend.com/domains/${d.id}`, {
        headers: { Authorization: `Bearer ${key}` }
      });
      const db = await detail.json().catch(() => ({}));
      domains.push({
        id: d.id,
        name: d.name,
        status: d.status,
        records: (db.records || []).map((r) => ({
          type: r.type,
          record: r.record,
          name: r.name,
          value: r.value,
          status: r.status,
          ttl: r.ttl,
          priority: r.priority
        }))
      });
    }
    return json(res, 200, { ok: true, domains });
  } catch (e) {
    return json(res, 500, { ok: false, error: e.message });
  }
}
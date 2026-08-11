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
    const r = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` }
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      return json(res, r.status, { ok: false, status: r.status, error: body.message || body });
    }
    const summary = (body.data || []).map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      records: (d.records || []).map((rec) => ({ type: rec.type, name: rec.name, value: rec.value, status: rec.status }))
    }));
    return json(res, 200, { ok: true, domains: summary });
  } catch (e) {
    return json(res, 500, { ok: false, error: e.message });
  }
}
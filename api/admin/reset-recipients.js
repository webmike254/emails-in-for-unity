// POST /api/admin/reset-recipients
// Fixes MailerSend error #MS42225 ("reached trial account unique recipients
// limit"). Free/trial MailerSend plans stop accepting new recipients once the
// unique-recipients counter hits the plan cap. MailerSend's documented
// development endpoint resets that counter to 0.
//
//   curl -X POST https://<app>/api/admin/reset-recipients \
//     -H "x-setup-secret: <SETUP_SECRET>" \
//     -H "Content-Type: application/json" -d "{}"
//
import { json } from '../_lib/http.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const secret = process.env.SETUP_SECRET;
  if (!secret || req.headers['x-setup-secret'] !== secret) {
    return json(res, 401, { error: 'Missing or invalid x-setup-secret header.' });
  }

  const token = process.env.MAILERSEND_API_TOKEN;
  if (!token) {
    return json(res, 500, { error: 'MAILERSEND_API_TOKEN is not set on this deployment.' });
  }

  try {
    const r = await fetch('https://api.mailersend.com/v1/settings/unique-recipients', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ unique_recipients: 0 })
    });
    const body = await r.text();
    return json(res, r.status === 200 ? 200 : r.status, {
      ok: r.status === 200,
      status: r.status,
      detail: body.slice(0, 500)
    });
  } catch (e) {
    return json(res, 500, { ok: false, error: e.message });
  }
}
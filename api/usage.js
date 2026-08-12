// GET /api/usage — how many emails you've sent today via Resend (free = 100/day).
// Wraps Resend's usage endpoint.
import { json } from './_lib/http.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const key = process.env.RESEND_API_KEY;
  if (!key) return json(res, 200, { ok: true, provider: 'resend', usage: null, limit: null, error: 'RESEND_API_KEY not set' });

  try {
    const r = await fetch('https://api.resend.com/usage', {
      headers: { Authorization: `Bearer ${key}` }
    });
    if (!r.ok) return json(res, r.status, { ok: false, error: `Resend usage endpoint returned HTTP ${r.status}` });
    const d = await r.json();
    const usage = Number(d.usage) || 0;
    const limit = Number(d.limit) || 0;
    return json(res, 200, {
      ok: true,
      provider: 'resend',
      usage,
      limit,
      remaining: Math.max(0, limit - usage),
      percent: limit ? Math.round((usage / limit) * 100) : 0
    });
  } catch (e) {
    return json(res, 500, { ok: false, error: e.message });
  }
}
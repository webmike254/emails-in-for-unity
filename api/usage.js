// GET /api/usage — daily sent-mail count.
// Tries Resend's usage endpoint first (BETA/plan dependent); falls back to
// counting today's sends logged in the Supabase `sends` table.
import { json } from './_lib/http.mjs';
import { supabaseConfigured, sbRequest } from './_lib/supabase.mjs';

const DAILY_LIMIT = Number(process.env.RESEND_DAILY_LIMIT) || 100;

/** Try Resend's own usage endpoint first (BETA, plan-dependent). */
async function resendUsage() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch('https://api.resend.com/usage', {
      headers: { Authorization: `Bearer ${key}`, 'User-Agent': 'unity-email-system/2.0' }
    });
    if (!r.ok) return null;
    const d = await r.json();
    return { usage: Number(d.usage) || 0, limit: Number(d.limit) || DAILY_LIMIT, source: 'resend' };
  } catch {
    return null;
  }
}

/** Fallback: count today's successful sends logged in Supabase `sends`. */
async function localUsage() {
  if (!supabaseConfigured()) return null;
  try {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const r = await sbRequest('GET', '/sends', {
      params: { select: 'id', created_at: `gte.${start.toISOString()}` }
    });
    if (!r.ok) return null;
    return { usage: (r.data || []).length, limit: DAILY_LIMIT, source: 'local' };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const viaResend = await resendUsage();
  const u = viaResend || (await localUsage());
  if (!u) {
    return json(res, 200, {
      ok: true,
      source: null,
      usage: 0,
      limit: DAILY_LIMIT,
      remaining: DAILY_LIMIT,
      percent: 0,
      note: 'No usage source available yet — run supabase-schema.sql (sends table) in Supabase.'
    });
  }
  const remaining = Math.max(0, u.limit - u.usage);
  return json(res, 200, {
    ok: true,
    source: u.source,
    usage: u.usage,
    limit: u.limit,
    remaining,
    percent: u.limit ? Math.round((u.usage / u.limit) * 100) : 0
  });
}
// Minimal Supabase/PostgREST client (zero dependencies).
// Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (with fallbacks to the
// emails_* prefixed vars some integrations create).

const URL = (process.env.SUPABASE_URL || process.env.emails_SUPABASE_URL || '').replace(/\/+$/, '');
const KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.emails_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.emails_SUPABASE_SECRET_KEY ||
  '';

export function supabaseConfigured() {
  return Boolean(URL && KEY);
}

/**
 * @param {'GET'|'POST'|'PATCH'|'DELETE'} method
 * @param {string} path e.g. "/emails" or "/emails?id=eq.xxx"
 * @param {object} [opts]
 */
export async function sbRequest(method, path, opts = {}) {
  if (!supabaseConfigured()) {
    const err = new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    err.status = 500;
    throw err;
  }
  const qs = opts.params ? `?${new URLSearchParams(opts.params)}` : '';
  const headers = {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json'
  };
  if (method === 'POST' || method === 'PATCH') headers.Prefer = 'return=representation';

  const res = await fetch(`${URL}/rest/v1${path}${qs}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}
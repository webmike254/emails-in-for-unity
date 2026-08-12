// /api/inbox — view/manage received mail stored in Supabase.
//
// All requests require the inbox PIN:
//   x-inbox-pin: <INBOX_PIN>
//
// GET  ?id=<uuid>          -> single message (with attachments)
// GET  ?limit=100          -> list messages (meta only)
// PATCH {id,is_read?,starred?} -> update flags
// DELETE {id}              -> delete a message
//
import { readBody, json, clean } from './_lib/http.mjs';
import { supabaseConfigured, sbRequest } from './_lib/supabase.mjs';

function authed(req) {
  const pin = process.env.INBOX_PIN;
  if (!pin) return true; // open when no PIN configured (dev)
  return (req.headers['x-inbox-pin'] || '') === pin;
}

export default async function handler(req, res) {
  if (!authed(req)) return json(res, 401, { error: 'Invalid or missing inbox PIN.' });
  if (!supabaseConfigured()) {
    return json(res, 500, {
      error: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.',
      needsSetup: true
    });
  }

  try {
    // GET list / single
    if (req.method === 'GET') {
      const id = clean(req.query && req.query.id);
      const limit = clean(req.query && req.query.limit) || '100';
      if (id) {
        const r = await sbRequest('GET', '/emails', {
          params: { select: '*', id: `eq.${id}`, limit: '1' }
        });
        if (!r.ok) return json(res, r.status, { error: explain(r) });
        return json(res, 200, { ok: true, message: (r.data && r.data[0]) || null });
      }
      const r = await sbRequest('GET', '/emails', {
        params: {
          select: 'id,sender,recipient,subject,created_at,is_read,starred',
          order: 'created_at.desc',
          limit
        }
      });
      if (!r.ok) return json(res, r.status, { error: explain(r) });
      return json(res, 200, { ok: true, messages: r.data || [], count: (r.data || []).length });
    }

    // PATCH flags
    if (req.method === 'PATCH') {
      const body = JSON.parse((await readBody(req)).toString('utf-8'));
      const id = clean(body.id);
      if (!id) return json(res, 400, { error: 'id is required.' });
      const patch = {};
      if (body.is_read !== undefined) patch.is_read = Boolean(body.is_read);
      if (body.starred !== undefined) patch.starred = Boolean(body.starred);
      const r = await sbRequest('PATCH', '/emails', {
        params: { id: `eq.${id}`, select: 'id,is_read,starred' },
        body: patch
      });
      if (!r.ok) return json(res, r.status, { error: explain(r) });
      return json(res, 200, { ok: true, updated: (r.data && r.data[0]) || null });
    }

    // DELETE
    if (req.method === 'DELETE') {
      const body = JSON.parse((await readBody(req)).toString('utf-8'));
      const id = clean(body.id);
      if (!id) return json(res, 400, { error: 'id is required.' });
      const r = await sbRequest('DELETE', '/emails', { params: { id: `eq.${id}` } });
      if (!r.ok) return json(res, r.status, { error: explain(r) });
      return json(res, 200, { ok: true, deleted: true });
    }

    // POST insert (e.g. UI test messages)
    if (req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString('utf-8'));
      const row = {
        sender: clean(body.sender) || 'unknown',
        recipient: clean(body.recipient) || null,
        subject: clean(body.subject) || '(no subject)',
        body_text: clean(body.text) || null,
        body_html: clean(body.html) || null,
        attachments: Array.isArray(body.attachments) ? body.attachments : [],
        metadata: body.metadata || {}
      };
      const r = await sbRequest('POST', '/emails', { body: row });
      if (!r.ok) return json(res, r.status, { error: explain(r) });
      return json(res, 200, { ok: true, message: (r.data && r.data[0]) || null });
    }

    return json(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return json(res, 500, { ok: false, error: e.message });
  }
}

function explain(r) {
  const d = r.data;
  if (d && typeof d === 'object' && d.message) return d.message;
  if (d && typeof d === 'object' && d.error && d.error.message) return d.error.message;
  if (d && typeof d === 'object' && d.details) return d.details;
  if (typeof d === 'string' && d) return d.slice(0, 300);
  return `Supabase responded with HTTP ${r.status}. If this is a missing-table error, run supabase-schema.sql in your Supabase SQL editor.`;
}
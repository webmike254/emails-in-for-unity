// /api/inbox-attachment — stream one stored attachment (media/document) back.
// GET ?id=<message-uuid>&i=<attachment-index>&name=<filename>
import { json } from './_lib/http.mjs';
import { supabaseConfigured, sbRequest } from './_lib/supabase.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  if (!supabaseConfigured()) {
    return json(res, 500, { error: 'Supabase is not configured.' });
  }

  const id = (req.query && req.query.id) || '';
  const index = parseInt((req.query && req.query.i) || '-1', 10);
  if (!id || index < 0) return json(res, 400, { error: 'id and i are required.' });

  try {
    const r = await sbRequest('GET', '/emails', {
      params: { select: 'attachments', id: `eq.${id}`, limit: '1' }
    });
    if (!r.ok) return json(res, r.status, { error: 'Could not load message.' });
    const row = r.data && r.data[0];
    const att = row && row.attachments && row.attachments[index];
    if (!att || !att.data) return json(res, 404, { error: 'Attachment not found.' });

    const buffer = Buffer.from(att.data, 'base64');
    const filename = encodeURIComponent(att.filename || 'file');
    res.statusCode = 200;
    res.setHeader('Content-Type', att.content_type || 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${filename}`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.end(buffer);
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}
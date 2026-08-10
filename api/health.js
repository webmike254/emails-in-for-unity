// GET /api/health — status endpoint (no secrets exposed).
import { json } from './_lib/http.mjs';
import { mailjetConfigured } from './_lib/mailjet.mjs';
import { listTemplates } from './_lib/templates.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  return json(res, 200, {
    ok: true,
    service: 'Unity Software Email System',
    version: '2.0.0',
    mailjetConfigured: mailjetConfigured(),
    defaultSender: process.env.SENDER_DEFAULT || 'hr@unity-software.online',
    inboundForwardTo: process.env.INBOUND_FORWARD_TO ? '(forwarding enabled)' : null,
    assetBase: process.env.ASSET_BASE_URL || '(relative — set ASSET_BASE_URL)',
    templates: listTemplates().map((t) => ({
      id: t.id,
      file: t.file,
      from: t.from
    })),
    time: new Date().toISOString()
  });
}
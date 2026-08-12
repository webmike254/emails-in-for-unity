// POST /api/inbound — Mailjet Inbound Parsing webhook.
//
// Mailjet POSTs received mail here as multipart/form-data with fields:
//   From / To / Header-from / Recipient / Subject / text / html ...
// We acknowledge every webhook (200) and, when INBOUND_FORWARD_TO is set,
// forward the message to that inbox via Mailjet send — giving you a real
// "receive" side with your existing mailbox.
import { readBody, parseMultipartForm, json, clean } from './_lib/http.mjs';
import { sendMail } from './_lib/sender.mjs';
import { supabaseConfigured, sbRequest } from './_lib/supabase.mjs';

function pick(fields, ...names) {
  for (const n of names) {
    if (fields[n] !== undefined && fields[n] !== '') return fields[n];
  }
  return '';
}

const MAX_ATTACH = 2 * 1024 * 1024; // 2 MB per attachment (base64)

/** Converts inbound files into a store-friendly attachment array (base64). */
function buildAttachments(files) {
  if (!Array.isArray(files)) return [];
  return files
    .filter((f) => f && f.data && f.data.length > 0)
    .map((f) => {
      const b64 = f.data.toString('base64');
      if (b64.length > MAX_ATTACH) return null; // skip oversized blobs
      return {
        filename: f.filename || 'file',
        content_type: f.contentType || 'application/octet-stream',
        size: f.size,
        data: b64
      };
    })
    .filter(Boolean);
}

/** Persists a received message into the Supabase inbox. */
async function storeInbox(inbound, attachments) {
  if (!supabaseConfigured()) return { stored: false, reason: 'supabase-not-configured' };
  const row = {
    sender: clean(inbound.from, 'unknown'),
    recipient: clean(inbound.to) || null,
    subject: clean(inbound.subject) || '(no subject)',
    body_text: clean(inbound.text) || null,
    body_html: clean(inbound.html) || null,
    attachments,
    metadata: { date: clean(inbound.date) || null, raw_from: clean(inbound.from) || null }
  };
  try {
    const r = await sbRequest('POST', '/emails', { body: row });
    if (!r.ok) {
      const msg = (r.data && (r.data.message || r.data.error || r.data.details)) || `HTTP ${r.status}`;
      return { stored: false, reason: String(msg).slice(0, 300) };
    }
    return { stored: true, id: (r.data && r.data[0] && r.data[0].id) || null };
  } catch (e) {
    return { stored: false, reason: e.message };
  }
}

function toPlainHtml(text) {
  return `<div style="font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111827;">${String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .split(/\r?\n/)
    .map((line) => `<p style="margin:0 0 10px 0;">${line || '&nbsp;'}</p>`)
    .join('')}</div>`;
}

async function deliver(inbound) {
  const forwardTo = clean(process.env.INBOUND_FORWARD_TO).split(',')[0];
  if (!forwardTo || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(forwardTo)) {
    return { sent: false, error: 'INBOUND_FORWARD_TO not set' };
  }
  try {
    const subject = clean(inbound.subject) || '(no subject)';
    const text =
      `From: ${inbound.from}\n` +
      `To: ${inbound.to}\n` +
      `Date: ${inbound.date || 'n/a'}\n` +
      `-------------------------------\n\n` +
      (inbound.text || '(no text body)');

    const html = inbound.html ||
      toPlainHtml(`From: ${inbound.from}\nTo: ${inbound.to}\n\n${inbound.text || ''}`);

    const result = await sendMail({
      from: { email: 'hello@unity-software.online', name: 'Unity Software Inbound' },
      to: { email: forwardTo, name: forwardTo },
      subject: `[Inbound] ${subject}`,
      text,
      html
    });
    return { sent: true, messageId: result.messageId };
  } catch (e) {
    return { sent: false, error: e.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const contentType = req.headers['content-type'] || '';
  const body = await readBody(req);
  const fields = {};
  let files = [];

  if (contentType.includes('multipart/form-data')) {
    const parsed = parseMultipartForm(body, contentType);
    Object.assign(fields, parsed.fields);
    files = parsed.files.filter((f) => f.size > 0);
  } else {
    try {
      Object.assign(fields, JSON.parse(body.toString('utf-8')));
    } catch {
      /* ignore non-JSON test payloads */
    }
  }

  const attachments = buildAttachments(files);

  const inbound = {
    from: pick(fields, 'From', 'Header-from', 'Sender', 'sender', 'from'),
    to: pick(fields, 'RcptTo', 'Recipient', 'To', 'recipient', 'to'),
    subject: pick(fields, 'Subject', 'subject'),
    text: pick(fields, 'TextPart', 'text', 'plain'),
    html: pick(fields, 'HtmlPart', 'html'),
    date: pick(fields, 'Date', 'date', 'Received'),
    attachments: files
  };

  const stored = await storeInbox(inbound, attachments);
  const forward = await deliver(inbound);

  return json(res, 200, {
    ok: true,
    receivedFrom: inbound.from || null,
    subject: inbound.subject || null,
    stored: stored.stored,
    inboxId: stored.id || null,
    storeError: stored.stored ? undefined : stored.reason,
    forwardedToGmail: forward.sent,
    forwardError: forward.sent ? undefined : forward.error
  });
}
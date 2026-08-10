// POST /api/inbound — Mailjet Inbound Parsing webhook.
//
// Mailjet POSTs received mail here as multipart/form-data with fields:
//   From / To / Header-from / Recipient / Subject / text / html ...
// We acknowledge every webhook (200) and, when INBOUND_FORWARD_TO is set,
// forward the message to that inbox via Mailjet send — giving you a real
// "receive" side with your existing mailbox.
import { readBody, parseMultipartForm, json, clean } from './_lib/http.mjs';
import { sendMail } from './_lib/sender.mjs';

function pick(fields, ...names) {
  for (const n of names) {
    if (fields[n] !== undefined && fields[n] !== '') return fields[n];
  }
  return '';
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
  if (!forwardTo || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(forwardTo)) return;

  const subject = clean(inbound.subject) || '(no subject)';
  const text =
    `From: ${inbound.from}\n` +
    `To: ${inbound.to}\n` +
    `Date: ${inbound.date || 'n/a'}\n` +
    `-------------------------------\n\n` +
    (inbound.text || '(no text body)');

  const html = inbound.html ||
    toPlainHtml(`From: ${inbound.from}\nTo: ${inbound.to}\n\n${inbound.text || ''}`);

  await sendMail({
    from: { email: 'hello@unity-software.online', name: 'Unity Software Inbound' },
    to: { email: forwardTo, name: forwardTo },
    subject: `[Inbound] ${subject}`,
    text,
    html
  });
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

  const inbound = {
    from: pick(fields, 'From', 'Header-from', 'Sender', 'sender', 'from'),
    to: pick(fields, 'RcptTo', 'Recipient', 'To', 'recipient', 'to'),
    subject: pick(fields, 'Subject', 'subject'),
    text: pick(fields, 'TextPart', 'text', 'plain'),
    html: pick(fields, 'HtmlPart', 'html'),
    date: pick(fields, 'Date', 'date', 'Received'),
    attachments: files
  };

  try {
    await deliver(inbound);
  } catch {
    // Forwarding is best-effort; never fail the webhook on it.
  }

  return json(res, 200, { ok: true, receivedFrom: inbound.from || null, subject: inbound.subject || null });
}
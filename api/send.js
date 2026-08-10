// POST /api/send — send a branded Unity Software email via Mailjet.
//
// Body (JSON):
// {
//   "template": "hr" | "hiring" | "director" | "generic"   (default: generic)
//   "to": "person@example.com",
//   "toName": "Jane Doe",
//   "subject": "Optional override",
//   "from": { "email": "...", "name": "..." },              (optional override)
//   "vars": { "recipient_name": "Jane" },                    (optional)
//   "html": "<p>custom html</p>",                            (optional: use custom body)
//   "text": "plain text",                                    (optional)
//   "attachments": [{ "contentType": "...", "filename": "...", "base64": "..." }]
// }
import { readBody, json, clean } from './_lib/http.mjs';
import { sendMail } from './_lib/mailjet.mjs';
import { getTemplate, buildTemplate } from './_lib/templates.mjs';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  let data;
  try {
    const raw = await readBody(req);
    data = JSON.parse(raw.toString('utf-8'));
  } catch {
    return json(res, 400, { error: 'Body must be valid JSON.' });
  }

  const to = clean(data.to);
  if (!to || !EMAIL_RE.test(to)) {
    return json(res, 400, { error: 'A valid "to" email address is required.' });
  }
  const toName = clean(data.toName) || to.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const templateId = clean(data.template, 'generic');
  const tpl = getTemplate(templateId);
  if (!tpl) return json(res, 400, { error: `Unknown template "${templateId}". Valid: hr, hiring, director, generic.` });

  const from = data.from && data.from.email
    ? { email: clean(data.from.email), name: clean(data.from.name) || tpl.from.name }
    : { email: process.env.SENDER_DEFAULT || tpl.from.email, name: process.env.SENDER_NAME_DEFAULT || tpl.from.name };

  if (!EMAIL_RE.test(from.email)) {
    return json(res, 400, { error: 'The From email address is not valid.' });
  }

  const vars = data.vars && typeof data.vars === 'object' ? data.vars : {};
  vars.recipient_name = clean(vars.recipient_name, toName);

  let html = null;
  let text = clean(data.text);
  if (data.html && typeof data.html === 'string') {
    html = data.html;
  } else {
    html = buildTemplate(templateId, vars, process.env.ASSET_BASE_URL || '');
  }

  const subject = clean(data.subject) || tpl.subject;

  const attachments = Array.isArray(data.attachments)
    ? data.attachments.map((a) => ({
        contentType: clean(a.contentType, 'application/octet-stream'),
        filename: clean(a.filename, 'file'),
        base64: clean(a.base64)
      })).filter((a) => a.base64 && a.filename)
    : undefined;

  try {
    const result = await sendMail({ from, to: { email: to, name: toName }, subject, html, text, attachments });
    return json(res, 200, {
      success: true,
      to,
      template: templateId,
      from: from.email,
      subject,
      messageId: result.messageId
    });
  } catch (err) {
    return json(res, err.status || 500, { success: false, error: err.message });
  }
}
// POST /api/send — send a branded Unity Software email.
//
// Body (JSON):
// {
//   "template": "hr" | "hiring" | "director" | "generic" | "custom"   (default: generic, or custom when body is set)
//   "to": "person@example.com",
//   "toName": "Jane Doe",
//   "subject": "Subject line",
//   "body": "Your own plain-text message…",   (custom emails: rendered with letterhead + signature)
//   "sender_name": "Jane", "sender_title": "HR", "sender_email": "…", "sender_avatar": "avatar_hr.png",
//   "from": { "email": "...", "name": "..." },              (optional override)
//   "vars": { "recipient_name": "Jane" },                    (optional)
//   "html": "<p>custom html</p>",                            (optional: use exact custom body)
//   "text": "plain text",                                    (optional)
//   "attachments": [{ "contentType": "...", "filename": "...", "base64": "..." }]
// }
import { readBody, json, clean } from './_lib/http.mjs';
import { sendMail } from './_lib/sender.mjs';
import { getTemplate, buildTemplate } from './_lib/templates.mjs';
import { supabaseConfigured, sbRequest } from './_lib/supabase.mjs';
import { textToParagraphs } from './_lib/text.mjs';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  let data;
  try {
    const raw = await readBody(req);
    data = JSON.parse(raw.toString('utf-8'));
  } catch {
    return json(res, 400, { error: 'Body must be valid JSON.' });
  }

  const nameOf = (email) => email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const toList = [...new Set(clean(data.to).split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean))];
  if (!toList.length || !toList.every((e) => EMAIL_RE.test(e))) {
    return json(res, 400, { error: 'Provide at least one valid "to" email (comma-separated for multiple).' });
  }
  const toName = clean(data.toName) || nameOf(toList[0] || '');
  const toArray = toList.map((email) => ({ email, name: nameOf(email) }));

  const wantsCustom = typeof data.body === 'string' && data.body.trim().length > 0;
  const templateId = clean(data.template, wantsCustom ? 'custom' : 'generic');
  const tpl = getTemplate(templateId);
  if (!tpl) return json(res, 400, { error: `Unknown template "${templateId}". Valid: hr, hiring, director, generic, custom.` });

  const from = data.from && data.from.email
    ? { email: clean(data.from.email), name: clean(data.from.name) || tpl.from.name }
    : { email: process.env.SENDER_DEFAULT || tpl.from.email, name: process.env.SENDER_NAME_DEFAULT || tpl.from.name };

  if (!EMAIL_RE.test(from.email)) {
    return json(res, 400, { error: 'The From email address is not valid.' });
  }

  const vars = data.vars && typeof data.vars === 'object' ? data.vars : {};
  vars.recipient_name = clean(vars.recipient_name, toName);
  if (wantsCustom || templateId === 'custom') {
    vars.sender_name = clean(data.sender_name, from.name);
    vars.sender_title = clean(data.sender_title, tpl.senderTitle || 'Unity Software');
    vars.sender_email = clean(data.sender_email, from.email);
    vars.sender_avatar = clean(data.sender_avatar, tpl.avatar || 'avatar_hr.png');
    vars.email_body = textToParagraphs(data.body);
  }

  let html = null;
  let text = clean(data.text);
  if (data.html && typeof data.html === 'string') {
    html = data.html;
  } else {
    try {
      html = buildTemplate(templateId, vars, process.env.ASSET_BASE_URL || '');
    } catch (err) {
      return json(res, 500, { success: false, error: `Template render failed: ${err.message}` });
    }
  }
  if (!text && data.body) text = clean(data.body);

  const subject = clean(data.subject) || tpl.subject;

  const attachments = Array.isArray(data.attachments)
    ? data.attachments.map((a) => ({
        contentType: clean(a.contentType, 'application/octet-stream'),
        filename: clean(a.filename, 'file'),
        base64: clean(a.base64)
      })).filter((a) => a.base64 && a.filename)
    : undefined;

  try {
    const result = await sendMail({ from, to: toArray, subject, html, text, attachments });

    // Best-effort: log the send for the "Sent today" counter (Supabase).
    if (supabaseConfigured()) {
      sbRequest('POST', '/sends', {
        body: {
          sender: from.email,
          recipient: toList.join(', '),
          template: templateId,
          subject: subject || null,
          provider: result.provider,
          message_id: result.messageId || null
        }
      }).catch(() => {});
    }

    return json(res, 200, {
      success: true,
      to: toList.join(', '),
      toCount: toList.length,
      template: templateId,
      from: from.email,
      subject,
      provider: result.provider,
      messageId: result.messageId
    });
  } catch (err) {
    return json(res, err.status || 500, { success: false, error: err.message });
  }
}
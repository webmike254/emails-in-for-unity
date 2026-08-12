// Mailjet send helper (v3.1 API) — no external dependencies, uses global fetch.

const MJ_API_KEY = process.env.MAILJET_API_KEY || '';
const MJ_SECRET_KEY = process.env.MAILJET_SECRET_KEY || '';

export function mailjetConfigured() {
  return Boolean(MJ_API_KEY && MJ_SECRET_KEY);
}

function authHeader() {
  return 'Basic ' + Buffer.from(`${MJ_API_KEY}:${MJ_SECRET_KEY}`).toString('base64');
}

/**
 * Sends an email through Mailjet.
 *
 * @param {object} opts
 * @param {{email:string, name?:string}} opts.from
 * @param {{email:string, name?:string}} opts.to
 * @param {string} opts.subject
 * @param {string} opts.html   HTML body
 * @param {string} [opts.text] Plain-text body
 * @param {Array<{contentType:string, filename:string, base64:string}>} [opts.attachments]
 */
export async function sendMail(opts) {
  if (!mailjetConfigured()) {
    const err = new Error('Mailjet is not configured. Set MAILJET_API_KEY and MAILJET_SECRET_KEY.');
    err.status = 500;
    throw err;
  }

  const message = {
    From: { Email: opts.from.email, Name: opts.from.name || 'Unity Software' },
    To: (Array.isArray(opts.to) ? opts.to : [opts.to]).map((t) => ({ Email: t.email, Name: t.name || t.email })),
    Subject: opts.subject || 'Hello from Unity Software',
    HTMLPart: opts.html || '',
    CustomID: `unity-${Date.now()}`
  };
  if (opts.text) message.TextPart = opts.text;
  if (opts.attachments && opts.attachments.length) {
    message.Attachments = opts.attachments.map((a) => ({
      ContentType: a.contentType || 'application/octet-stream',
      Filename: a.filename || 'attachment',
      Base64Content: a.base64
    }));
  }

  const res = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader()
    },
    body: JSON.stringify({ Messages: [message] })
  });

  const body = await res.json().catch(() => ({}));
  const first = body.Messages && body.Messages[0];
  const ok = res.ok && first && first.Status === 'success';

  if (!ok) {
    const firstMessage =
      (first && first.Errors && first.Errors.map((e) => e.ErrorMessage).join('; ')) ||
      (body.ErrorMessage) ||
      `Mailjet responded with HTTP ${res.status}`;
    const err = new Error(firstMessage);
    err.status = res.status;
    throw err;
  }

  return {
    success: true,
    messageId: first && first.To && first.To[0] ? first.To[0].MessageID : null,
    status: first.Status
  };
}
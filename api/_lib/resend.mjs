// Resend send helper — POST https://api.resend.com/emails
// Enable by setting RESEND_API_KEY (and SEND_PROVIDER=resend).

const KEY = process.env.RESEND_API_KEY || '';

export function resendConfigured() {
  return Boolean(KEY);
}

/**
 * @param {object} opts
 * @param {{email:string, name?:string}} opts.from
 * @param {{email:string, name?:string}} opts.to
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string} [opts.text]
 * @param {Array<{contentType:string, filename:string, base64:string}>} [opts.attachments]
 */
export async function sendMail(opts) {
  if (!resendConfigured()) {
    const err = new Error('Resend is not configured. Set RESEND_API_KEY.');
    err.status = 500;
    throw err;
  }

  const payload = {
    from: `${opts.from.name || 'Unity Software'} <${opts.from.email}>`,
    to: (Array.isArray(opts.to) ? opts.to : [opts.to]).map((t) => t.email || t),
    subject: opts.subject || 'Hello from Unity Software',
    html: opts.html || ''
  };
  if (opts.text) payload.text = opts.text;
  if ((opts.from && opts.from.email)) payload.reply_to = opts.from.email;
  if (opts.attachments && opts.attachments.length) {
    payload.attachments = opts.attachments.map((a) => ({
      content: a.base64,
      filename: a.filename,
      content_type: a.contentType || 'application/octet-stream'
    }));
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (body.message) || (body.error && body.error.message) || `Resend responded with HTTP ${res.status}`;
    const err = new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    err.status = res.status;
    throw err;
  }

  return { success: true, messageId: body.id || null, status: 'success' };
}
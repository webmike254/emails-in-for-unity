// MailerSend send helper (v1 API) — alternative provider for "flexible sending".
// Enable by setting MAILERSEND_API_TOKEN (and optionally SEND_PROVIDER=mailersend).

const TOKEN = process.env.MAILERSEND_API_TOKEN || '';

export function mailersendConfigured() {
  return Boolean(TOKEN);
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
  if (!mailersendConfigured()) {
    const err = new Error('MailerSend is not configured. Set MAILERSEND_API_TOKEN.');
    err.status = 500;
    throw err;
  }

  const payload = {
    from: { email: opts.from.email, name: opts.from.name || 'Unity Software' },
    to: (Array.isArray(opts.to) ? opts.to : [opts.to]).map((t) => ({ email: t.email, name: t.name || t.email })),
    subject: opts.subject || 'Hello from Unity Software',
    text: opts.text || '',
    html: opts.html || ''
  };
  if (opts.attachments && opts.attachments.length) {
    payload.attachments = opts.attachments.map((a) => ({
      content: a.base64,
      filename: a.filename,
      disposition: 'attachment',
      id: a.filename
    }));
  }

  const res = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const detail = body.slice(0, 400) || `MailerSend responded with HTTP ${res.status}`;
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }

  return {
    success: true,
    messageId: res.headers.get('x-message-id') || null,
    status: 'success'
  };
}
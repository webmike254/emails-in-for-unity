const API = 'https://api.mailersend.com/v1'

export type Attachment = {
  content: string // base64
  filename: string
  disposition?: 'attachment' | 'inline'
}

export type SendPayload = {
  fromEmail: string
  fromName: string
  toEmail: string
  toName?: string
  subject: string
  html: string
  text?: string
  replyToEmail?: string
  replyToName?: string
  attachments?: Attachment[]
}

export async function sendEmail(payload: SendPayload) {
  const token = process.env.MAILERSEND_API_TOKEN
  if (!token) throw new Error('MAILERSEND_API_TOKEN is not set')

  const body: any = {
    from: { email: payload.fromEmail, name: payload.fromName },
    to: [{ email: payload.toEmail, name: payload.toName || payload.toEmail }],
    subject: payload.subject,
    html: payload.html,
    text: payload.text || payload.html.replace(/<[^>]+>/g, ' ').slice(0, 5000),
    reply_to: {
      email: payload.replyToEmail || payload.fromEmail,
      name: payload.replyToName || payload.fromName,
    },
  }

  if (payload.attachments?.length) {
    body.attachments = payload.attachments.map((a) => ({
      content: a.content,
      filename: a.filename,
      disposition: a.disposition || 'attachment',
    }))
  }

  const res = await fetch(`${API}/email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MailerSend ${res.status}: ${err}`)
  }

  const messageId = res.headers.get('x-message-id') || res.headers.get('X-Message-Id')
  return { messageId, status: res.status }
}

/** Plain text → simple email paragraphs */
export function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const parts = escaped.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  if (!parts.length) {
    return '<p style="margin:0 0 16px 0;font-size:16px;line-height:1.65;color:#1f2937;"></p>'
  }
  return parts
    .map((p) => {
      const withBreaks = p.replace(/\n/g, '<br />')
      return `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.65;color:#1f2937;">${withBreaks}</p>`
    })
    .join('\n')
}

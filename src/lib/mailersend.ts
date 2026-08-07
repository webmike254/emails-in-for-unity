const API = 'https://api.mailersend.com/v1'

export type SendPayload = {
  fromEmail: string
  fromName: string
  toEmail: string
  toName?: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(payload: SendPayload) {
  const token = process.env.MAILERSEND_API_TOKEN
  if (!token) throw new Error('MAILERSEND_API_TOKEN is not set')

  const body = {
    from: { email: payload.fromEmail, name: payload.fromName },
    to: [{ email: payload.toEmail, name: payload.toName || payload.toEmail }],
    subject: payload.subject,
    html: payload.html,
    text: payload.text || payload.html.replace(/<[^>]+>/g, ' ').slice(0, 5000),
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

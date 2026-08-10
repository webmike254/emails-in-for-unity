// Provider dispatcher — "sending is flexible".
// SEND_PROVIDER=mailjet | mailersend | auto (default auto: mailersend if a token
// is configured, otherwise mailjet).
import { mailjetConfigured, sendMail as sendViaMailjet } from './mailjet.mjs';
import { mailersendConfigured, sendMail as sendViaMailersend } from './mailersend.mjs';

const PROVIDER = (process.env.SEND_PROVIDER || 'auto').toLowerCase();

export function activeProvider() {
  if (PROVIDER === 'mailersend') return 'mailersend';
  if (PROVIDER === 'mailjet') return 'mailjet';
  return mailersendConfigured() ? 'mailersend' : 'mailjet';
}

export function isConfigured() {
  return activeProvider() === 'mailjet' ? mailjetConfigured() : mailersendConfigured();
}

export async function sendMail(opts) {
  const provider = activeProvider();
  if (provider === 'mailersend') {
    return { provider, ...(await sendViaMailersend(opts)) };
  }
  return { provider, ...(await sendViaMailjet(opts)) };
}
// Provider dispatcher — "sending is flexible".
// SEND_PROVIDER = resend | mailersend | mailjet | auto (default auto).
// Auto priority: resend → mailersend → mailjet.
// Mailjet is only used when explicitly set as SEND_PROVIDER=mailjet.
import { mailjetConfigured, sendMail as sendViaMailjet } from './mailjet.mjs';
import { mailersendConfigured, sendMail as sendViaMailersend } from './mailersend.mjs';
import { resendConfigured, sendMail as sendViaResend } from './resend.mjs';

const PROVIDER = (process.env.SEND_PROVIDER || 'auto').toLowerCase();

export function activeProvider() {
  if (PROVIDER === 'resend') return 'resend';
  if (PROVIDER === 'mailersend') return 'mailersend';
  if (PROVIDER === 'mailjet') return 'mailjet';
  if (resendConfigured()) return 'resend';
  if (mailersendConfigured()) return 'mailersend';
  return 'mailjet';
}

function isConfiguredFor(name) {
  if (name === 'resend') return resendConfigured();
  if (name === 'mailjet') return mailjetConfigured();
  if (name === 'mailersend') return mailersendConfigured();
  return false;
}

async function deliver(name, opts) {
  if (name === 'resend') return { provider: 'resend', ...(await sendViaResend(opts)) };
  if (name === 'mailjet') return { provider: 'mailjet', ...(await sendViaMailjet(opts)) };
  return { provider: 'mailersend', ...(await sendViaMailersend(opts)) };
}

export function isConfigured() {
  return isConfiguredFor(activeProvider());
}

/** True when a provider error is an account-level quota we can retry elsewhere. */
function isRetryableLimitError(message) {
  return /unique recipients|MS42225|temporarily blocked|mj-0001|rate_limit|too many requests/i.test(message || '');
}

export async function sendMail(opts) {
  const primary = activeProvider();
  // No silent fallback: the chosen provider is used directly. Fallbacks can mask
  // real errors (e.g. a trial account's unique-recipient cap) and are not reliable.
  if (!isConfiguredFor(primary)) throw new Error('No email provider available.');
  return await deliver(primary, opts);
}
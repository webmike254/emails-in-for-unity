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
  // Fallback chain. Mailjet is excluded unless it is the explicit primary.
  let order;
  if (primary === 'mailjet') order = ['mailjet', 'resend', 'mailersend'];
  else if (primary === 'resend') order = ['resend', 'mailersend'];
  else order = ['mailersend', 'resend'];

  let lastError = null;
  for (const name of order) {
    if (!isConfiguredFor(name)) continue;
    try {
      return await deliver(name, opts);
    } catch (err) {
      lastError = err;
      if (!isRetryableLimitError(err.message)) break;
    }
  }
  throw lastError || new Error('No email provider available.');
}
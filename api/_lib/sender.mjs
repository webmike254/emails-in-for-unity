// Provider dispatcher — "sending is flexible".
// SEND_PROVIDER=mailjet | mailersend | auto (default auto: prefer mailersend if a
// token is set, otherwise mailjet). If the active provider hits an account-level
// sending limit (e.g. MailerSend trial unique-recipients cap, MS42225), the
// dispatcher automatically retries with the other configured provider.
import { mailjetConfigured, sendMail as sendViaMailjet } from './mailjet.mjs';
import { mailersendConfigured, sendMail as sendViaMailersend } from './mailersend.mjs';

const PROVIDER = (process.env.SEND_PROVIDER || 'auto').toLowerCase();

export function activeProvider() {
  if (PROVIDER === 'mailersend') return 'mailersend';
  if (PROVIDER === 'mailjet') return 'mailjet';
  return mailersendConfigured() ? 'mailersend' : 'mailjet';
}

function isConfiguredFor(name) {
  if (name === 'mailjet') return mailjetConfigured();
  if (name === 'mailersend') return mailersendConfigured();
  return false;
}

async function deliver(name, opts) {
  if (name === 'mailjet') return { provider: 'mailjet', ...(await sendViaMailjet(opts)) };
  return { provider: 'mailersend', ...(await sendViaMailersend(opts)) };
}

export function isConfigured() {
  return isConfiguredFor(activeProvider());
}

/** True when a provider error is an account-level quota we can retry elsewhere. */
function isRetryableLimitError(message) {
  return /unique recipients|MS42225|temporarily blocked|mj-0001/i.test(message || '');
}

export async function sendMail(opts) {
  let order = [activeProvider()];
  const alt = activeProvider() === 'mailersend' ? 'mailjet' : 'mailersend';
  if (isConfiguredFor(alt) && alt !== order[0]) order.push(alt);

  let lastError = null;
  for (const name of order) {
    if (!isConfiguredFor(name)) continue;
    try {
      return await deliver(name, opts);
    } catch (err) {
      lastError = err;
      // Only fail over on account-level quota errors; surface everything else.
      if (!isRetryableLimitError(err.message)) break;
    }
  }
  throw lastError || new Error('No email provider available.');
}
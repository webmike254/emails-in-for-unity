// tools/test-send.mjs
// Local helper: sends a real test email through Mailjet.
// Reads .env for MAILJET_API_KEY / MAILJET_SECRET_KEY / SENDER_DEFAULT.
//
//   node tools/test-send.mjs you@example.com "Jane Doe" hr
//
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function loadEnv() {
  try {
    const content = readFileSync(join(ROOT, '.env'), 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    /* no .env file */
  }
}

loadEnv();

const to = process.argv[2] || process.env.TEST_TO;
const toName = process.argv[3] || 'There';
const templateId = process.argv[4] || 'generic';

if (!to) {
  console.error('Usage: node tools/test-send.mjs <to@example.com> [name] [hr|hiring|director|generic]');
  process.exit(1);
}

const { sendMail } = await import(pathToFileURL(join(ROOT, 'api/_lib/mailjet.mjs')));
const { buildTemplate } = await import(pathToFileURL(join(ROOT, 'api/_lib/templates.mjs')));

try {
  const html = buildTemplate(templateId, { recipient_name: toName }, process.env.ASSET_BASE_URL || '');
  const result = await sendMail({
    from: { email: process.env.SENDER_DEFAULT || 'hr@unity-software.online', name: process.env.SENDER_NAME_DEFAULT || 'Unity Software' },
    to: { email: to, name: toName },
    subject: 'Test from Unity Software Email System',
    html
  });
  console.log('✓ Sent!', JSON.stringify(result));
} catch (err) {
  console.error('✖ Failed:', err.message);
  process.exit(1);
}
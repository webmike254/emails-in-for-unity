// Template registry + placeholder rendering.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

/** Sender identity defined by the README / MailerSend setup, now used with Mailjet. */
export const TEMPLATES = {
  hr: {
    file: 'congrats-from-hr.html',
    from: { email: 'hr@unity-software.online', name: 'Amara Njoroge' },
    subject: 'Congratulations',
    avatar: 'avatar_hr.png',
    senderTitle: 'HR Manager'
  },
  hiring: {
    file: 'congrats-from-hiring.html',
    from: { email: 'hiring@unity-software.online', name: 'Daniel Ochieng' },
    subject: 'Welcome aboard',
    avatar: 'avatar_hiring.png',
    senderTitle: 'Hiring Manager'
  },
  director: {
    file: 'congrats-from-director.html',
    from: { email: 'director@unity-software.online', name: 'Grace Wambui' },
    subject: 'Congratulations',
    avatar: 'avatar_director.png',
    senderTitle: 'Director'
  },
  generic: {
    file: 'congratulation-email.html',
    from: { email: 'hello@unity-software.online', name: 'Unity Software' },
    subject: 'Congratulations',
    avatar: 'avatar_hr.png',
    senderTitle: 'Unity Software'
  }
};

export function listTemplates() {
  return Object.entries(TEMPLATES).map(([id, t]) => ({ id, ...t }));
}

export function getTemplate(id) {
  return TEMPLATES[id] || null;
}

export function loadTemplate(id) {
  const t = getTemplate(id);
  if (!t) return null;
  try {
    return readFileSync(join(ROOT, t.file), 'utf-8');
  } catch {
    return null;
  }
}

/** Replaces {{key}} placeholders. Unknown placeholders become empty strings. */
export function fillTemplate(html, vars = {}) {
  return html.replace(/\{\{\s*([\w_.-]+)\s*\}\}/g, (match, key) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

/**
 * Rewrites relative asset references (src/href) to absolute URLs.
 * Skips absolute URLs, protocol-relative URLs, data: URIs and template vars.
 */
export function absolutizeAssets(html, assetBase) {
  if (!assetBase) return html;
  const base = assetBase.replace(/\/+$/, '');
  return html.replace(
    /(src|href)=(["'])(?!https?:\/\/|\/\/|data:|cid:|#|\{\{)([^"']+)\2/gi,
    (match, attr, quote, path) => `${attr}=${quote}${base}/${path}${quote}`
  );
}

/** Loads + renders a template with sensible default vars. */
export function buildTemplate(id, vars = {}, assetBase = '') {
  const t = getTemplate(id);
  const html = loadTemplate(id);
  if (!t || html == null) throw new Error(`Unknown template: ${id}`);

  const defaults = {
    recipient_name: 'there',
    sender_name: t.from.name,
    sender_title: t.senderTitle || 'Unity Software',
    sender_email: t.from.email
  };
  const merged = { ...defaults, ...vars };
  let rendered = fillTemplate(html, merged);
  rendered = absolutizeAssets(rendered, assetBase || process.env.ASSET_BASE_URL || '');
  return rendered;
}
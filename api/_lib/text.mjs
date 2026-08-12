// text.mjs — plain-text → safe HTML with clickable links (used by custom emails).
const LINK_COLOR = '#f59e0b';

export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Turns bare URLs + [text](url) into clickable anchors. Expects pre-escaped HTML. */
export function autoLink(html) {
  // Markdown-style: [label](https://…)
  let out = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (m, label, url) =>
      `<a href="${url}" target="_blank" style="color:${LINK_COLOR};text-decoration:underline;">${label}</a>`
  );
  // Bare URLs: https://…
  out = out.replace(
    /(^|[\s(>])(https?:\/\/[^\s<)"']+)/g,
    (m, pre, url) =>
      `${pre}<a href="${url}" target="_blank" style="color:${LINK_COLOR};text-decoration:underline;">${url}</a>`
  );
  return out;
}

/** Escapes + linkifies + splits into styled paragraphs for email bodies. */
export function textToParagraphs(value) {
  const html = autoLink(escapeHtml(value));
  const paragraphs = html
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(
      (line) =>
        `<p style="margin:0 0 16px 0; font-size:16px; line-height:1.65; color:#374151;" class="text-primary">${line}</p>`
    )
    .join('\n');
  return paragraphs || '<p style="margin:0; font-size:16px; line-height:1.65; color:#374151;" class="text-primary"></p>';
}
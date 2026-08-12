// Smoke test for api/_lib/text.mjs linkification.
import { textToParagraphs, escapeHtml, autoLink } from '../api/_lib/text.mjs';

const checks = [
  ['bare url clickable', textToParagraphs('See https://example.com/app here').includes('href="https://example.com/app"')],
  ['markdown link', textToParagraphs('Use [the portal](https://portal.example.com) today').includes('href="https://portal.example.com"')],
  ['escaped html stays safe', !escapeHtml('<script>x</script>').includes('<script')],
  ['link target blank', textToParagraphs('go https://x.io').includes('target="_blank"')],
  ['line breaks preserved as paragraphs', textToParagraphs('one\n\ntwo').split('<p').length >= 3]
];

let ok = true;
for (const [label, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}`);
  if (!pass) ok = false;
}
process.exit(ok ? 0 : 1);
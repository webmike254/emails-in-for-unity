// Quick smoke test for template rendering helpers (not part of the app).
import { getTemplate, buildTemplate, absolutizeAssets, listTemplates } from '../api/_lib/templates.mjs';

let failed = false;
const check = (label, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failed = true;
};

check('lists 4 templates', listTemplates().length === 4);
check('hr template exists', getTemplate('hr').from.email === 'hr@unity-software.online');
check('unknown template is null', getTemplate('nope') === null);

const hr = buildTemplate('hr', { recipient_name: 'Jane' }, 'https://cdn.example.com');
check('placeholder filled', hr.includes('Dear Jane,'));
check('relative asset rewritten', hr.includes('src="https://cdn.example.com/header.jpg"'));
check('absolute URL left alone', absolutizeAssets('<img src="https://x/y.png">', 'https://cdn.example.com').includes('src="https://x/y.png"'));

const generic = buildTemplate('generic', { recipient_name: 'Bob' }, 'https://cdn.example.com');
check('generic from hello@', getTemplate('generic').from.email === 'hello@unity-software.online');
check('generic sender placeholders filled', generic.includes('Unity Software') && !generic.includes('{{sender_name}}'));

if (failed) process.exit(1);
console.log('\nTemplate engine OK');
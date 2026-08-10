// tools/upload-assets.mjs
// Uploads the email assets (header.jpg + avatars) to Cloudflare R2 and makes
// the bucket publicly readable so images render inside sent emails.
//
// Usage:
//   set env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//   node tools/upload-assets.mjs
//
// Implements AWS SigV4 with zero external dependencies (global fetch + node:crypto).

import { createHash, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || '';
const SECRET = process.env.R2_SECRET_ACCESS_KEY || '';
const BUCKET = process.env.R2_BUCKET || 'unity-email-assets';
const ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;
const REGION = 'auto';
const SERVICE = 's3';

const ASSET_FILES = ['header.jpg', 'avatar_hr.png', 'avatar_hiring.png', 'avatar_director.png'];

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp'
};

function sha256hex(data) {
  return createHash('sha256').update(data).digest('hex');
}
function hmac(key, data) {
  return createHmac('sha256', key).update(data).digest();
}
function hmacHex(key, data) {
  return createHmac('sha256', key).update(data).digest('hex');
}

function nowIso() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return { amzDate: `${y}${m}${day}T${h}${min}${s}Z`, dateStamp: `${y}${m}${day}` };
}

function signingKey(dateStamp) {
  const kDate = hmac(`AWS4${SECRET}`, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, 'aws4_request');
}

async function r2Request(method, resource, { contentType, payload } = {}) {
  const { amzDate, dateStamp } = nowIso();
  const host = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const body = payload ? (Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf-8')) : Buffer.alloc(0);
  const payloadHash = sha256hex(body);

  const canonicalHeaders =
    `content-type:${contentType || 'application/octet-stream'}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest =
    `${method}\n${resource}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const stringToSign =
    `AWS4-HMAC-SHA256\n${amzDate}\n${dateStamp}/${REGION}/${SERVICE}/aws4_request\n` +
    sha256hex(canonicalRequest);

  const signature = hmacHex(signingKey(dateStamp), stringToSign);

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${dateStamp}/${REGION}/${SERVICE}/aws4_request, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(`${ENDPOINT}${resource}`, {
    method,
    headers: {
      Authorization: authorization,
      'Content-Type': contentType || 'application/octet-stream',
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate
    },
    body: body.length ? body : undefined
  });
}

function fail(msg) {
  console.error('');
  console.error(`✖ ${msg}`);
  console.error('Verify R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are set (see .env.example).');
  process.exit(1);
}

async function ensureBucket() {
  const exists = await r2Request('HEAD', `/${BUCKET}`);
  if (exists.status === 200) {
    console.log(`✓ Bucket "${BUCKET}" already exists.`);
    return;
  }
  if (exists.status !== 404) {
    fail(`Could not check bucket (HEAD ${BUCKET} → ${exists.status}). ${await exists.text()}`);
  }
  const created = await r2Request('PUT', `/${BUCKET}`, {
    contentType: 'application/xml',
    payload:
      '<CreateBucketConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">' +
      '<LocationConstraint>auto</LocationConstraint></CreateBucketConfiguration>'
  });
  if (created.status !== 200 && created.status !== 204) {
    fail(`Failed to create bucket "${BUCKET}" (${created.status}). ${await created.text()}`);
  }
  console.log(`✓ Bucket "${BUCKET}" created.`);
}

async function makePublic() {
  const xml =
    '<Policy>' +
    '<Version>2012-10-17</Version>' +
    '<Statement><Effect>Allow</Effect><Principal><AWS>*</AWS></Principal>' +
    `<Action>s3:GetObject</Action><Resource>arn:aws:s3:::${BUCKET}/*</Resource></Statement>` +
    '</Policy>';

  const res = await r2Request('PUT', `/${BUCKET}?policy`, {
    contentType: 'application/octet-stream',
    payload: Buffer.from(xml)
  });
  if (res.status === 200 || res.status === 204) {
    console.log('✓ Bucket is publicly readable (s3:GetObject for everyone).');
    return true;
  }
  console.warn(
    `⚠ Could not apply public-read policy (${res.status}) — enable Public Access to the bucket in the Cloudflare dashboard, or serve images from Vercel instead.`
  );
  return false;
}

async function uploadAsset(file) {
  const data = readFileSync(join(ROOT, file));
  const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
  const resource = `/${BUCKET}/${file}`;
  const res = await r2Request('PUT', resource, { contentType, payload: data });
  if (res.status !== 200 && res.status !== 204) {
    throw new Error(`Upload ${file} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  console.log(`  ↑ ${file} (${data.length} bytes)`);
  return `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${file}`;
}

async function main() {
  if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET) fail('Missing R2 credentials.');
  console.log(`R2 bucket: ${BUCKET}`);
  await ensureBucket();
  for (const file of ASSET_FILES) {
    await uploadAsset(file);
  }
  const pub = await makePublic();
  if (pub) {
    console.log('');
    console.log('Assets are publicly hosted. Set this env var in Vercel so sent emails use them:');
    console.log(`  ASSET_BASE_URL=https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}`);
  }
}

main().catch((err) => {
  console.error('');
  console.error(`✖ ${err.message}`);
  process.exit(1);
});
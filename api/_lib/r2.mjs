// Minimal SigV4 S3 client for Cloudflare R2 (no external dependencies).
// Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
import { createHash, createHmac } from 'node:crypto';

const REGION = 'auto';
const SERVICE = 's3';

export function r2Config() {
  return {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKey: process.env.R2_ACCESS_KEY_ID || '',
    secret: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET || 'unity-email-assets'
  };
}

export function r2Configured() {
  const c = r2Config();
  return Boolean(c.accountId && c.accessKey && c.secret);
}

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

function signingKey(dateStamp, secret) {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, 'aws4_request');
}

export async function r2Request(method, resource, { contentType, payload } = {}) {
  const { accountId, accessKey, secret } = r2Config();
  const { amzDate, dateStamp } = nowIso();
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const body = payload ? (Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf-8')) : Buffer.alloc(0);
  const payloadHash = sha256hex(body);
  const ctype = contentType || 'application/octet-stream';

  const canonicalHeaders =
    `content-type:${ctype}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = `${method}\n${resource}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const stringToSign =
    `AWS4-HMAC-SHA256\n${amzDate}\n${dateStamp}/${REGION}/${SERVICE}/aws4_request\n` +
    sha256hex(canonicalRequest);
  const signature = hmacHex(signingKey(dateStamp, secret), stringToSign);

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${dateStamp}/${REGION}/${SERVICE}/aws4_request, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}${resource}`, {
    method,
    headers: {
      Authorization: authorization,
      'Content-Type': ctype,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate
    },
    body: body.length ? body : undefined
  });
  return res;
}

/** Creates the bucket if it does not exist yet. */
export async function ensureBucket() {
  const { bucket } = r2Config();
  const head = await r2Request('HEAD', `/${bucket}`);
  if (head.status === 200) return { created: false };
  if (head.status !== 404) {
    throw new Error(`HEAD bucket failed (${head.status}): ${(await head.text()).slice(0, 300)}`);
  }
  const created = await r2Request('PUT', `/${bucket}`, {
    contentType: 'application/xml',
    payload:
      '<CreateBucketConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">' +
      '<LocationConstraint>auto</LocationConstraint></CreateBucketConfiguration>'
  });
  if (created.status !== 200 && created.status !== 204) {
    throw new Error(`CreateBucket failed (${created.status}): ${(await created.text()).slice(0, 300)}`);
  }
  return { created: true };
}

/** Uploads one object with a content type guessed from its filename. */
export async function putObject(key, data) {
  const { bucket } = r2Config();
  const ext = key.slice(key.lastIndexOf('.')).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.css': 'text/css', '.js': 'application/javascript'
  };
  const res = await r2Request('PUT', `/${bucket}/${key}`, {
    contentType: types[ext] || 'application/octet-stream',
    payload: data
  });
  if (res.status !== 200 && res.status !== 204) {
    throw new Error(`PutObject ${key} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  return `https://${r2Config().accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
}

/** Grants public read access to the bucket. */
export async function makeBucketPublic() {
  const { bucket } = r2Config();
  const xml =
    '<Policy>' +
    '<Version>2012-10-17</Version>' +
    '<Statement><Effect>Allow</Effect><Principal><AWS>*</AWS></Principal>' +
    `<Action>s3:GetObject</Action><Resource>arn:aws:s3:::${bucket}/*</Resource></Statement>` +
    '</Policy>';
  const res = await r2Request('PUT', `/${bucket}?policy`, {
    contentType: 'application/octet-stream',
    payload: Buffer.from(xml)
  });
  if (res.status !== 200 && res.status !== 204) {
    throw new Error(`PutBucketPolicy failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  return true;
}

export function r2PublicBase() {
  const { accountId, bucket } = r2Config();
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}`;
}
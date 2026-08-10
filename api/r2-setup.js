// POST /api/r2-setup — one-time bootstrap: creates the R2 bucket, uploads the
// email assets, applies a public-read policy. Must be called with the setup
// secret header so it can never be triggered by an outsider.
//
//   curl -X POST https://<app>/api/r2-setup \
//     -H "x-setup-secret: <SETUP_SECRET>" \
//     -H "Content-Type: application/json" -d "{}"
//
// Requires env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
// R2_BUCKET, SETUP_SECRET.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { json } from './_lib/http.mjs';
import { r2Configured, ensureBucket, putObject, makeBucketPublic, r2PublicBase } from './_lib/r2.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const ASSETS = ['header.jpg', 'avatar_hr.png', 'avatar_hiring.png', 'avatar_director.png'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const secret = process.env.SETUP_SECRET;
  const provided = req.headers['x-setup-secret'] || '';
  if (!secret || provided !== secret) {
    return json(res, 401, { error: 'Missing or invalid x-setup-secret header.' });
  }
  if (!r2Configured()) {
    return json(res, 500, {
      error: 'R2 is not configured on this deployment. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.',
      hint: 'If R2 is not enabled on the Cloudflare account, open the Cloudflare dashboard > R2 and enable it first.'
    });
  }

  try {
    const { created } = await ensureBucket();
    const uploaded = [];
    for (const file of ASSETS) {
      uploaded.push(await putObject(file, readFileSync(join(ROOT, file))));
    }
    await makeBucketPublic();
    return json(res, 200, {
      ok: true,
      bucketCreated: created,
      uploaded,
      assetBase: r2PublicBase(),
      next: 'Set ASSET_BASE_URL env var to the assetBase value, then redeploy and test with /api/send.'
    });
  } catch (err) {
    return json(res, 500, { ok: false, error: err.message });
  }
}
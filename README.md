# Unity Software — Email System

Branded letterhead emails for [Unity Software](https://www.unity-software.online). This project is a **send + receive email platform**:

- **Send** — Mailjet v3.1 API with four HTML templates and per-role sender identities on `unity-software.online` (DKIM/SPF verified).
- **Receive** — Mailjet Inbound Parsing webhook → `/api/inbound` → forwarded to your inbox.
- **Hosting** — Vercel (serverless functions + static preview).
- **Assets** — currently served by the Vercel deployment; optional Cloudflare R2 via `/api/r2-setup` (see below).

## Project layout

| Path | Purpose |
|------|---------|
| `index.html` | Preview + "send a test email" + webhook simulator UI |
| `congrats-from-hr.html` | HR Manager template (Amara Njoroge) |
| `congrats-from-hiring.html` | Hiring Manager template (Daniel Ochieng) |
| `congrats-from-director.html` | Director template (Grace Wambui) |
| `congratulation-email.html` | Generic template with `{{ }}` placeholders |
| `header.jpg`, `avatar_*.png` | Letterhead + sender photos |
| `api/send.js` | `POST /api/send` — render + send via Mailjet |
| `api/inbound.js` | `POST /api/inbound` — Mailjet inbound webhook |
| `api/health.js` | `GET /api/health` — status |
| `api/r2-setup.js` | `POST /api/r2-setup` — optional R2 asset bootstrap |
| `api/_lib/` | Shared helpers (Mailjet, templates, SigV4/R2, HTTP/multipart) |
| `tools/` | Local scripts (`test-send.mjs`, `upload-assets.mjs`, smoke tests) |

Zero runtime dependencies — functions use Node's built-in `fetch` and `crypto`. Vercel auto-detects `api/*.js` as serverless functions and serves everything else as static files.

## Environment variables

Set these in the Vercel project (or a local `.env`):

| Variable | Required | Notes |
|----------|----------|-------|
| `MAILJET_API_KEY` | yes (sending) | Mailjet API key |
| `MAILJET_SECRET_KEY` | yes (sending) | Mailjet secret key |
| `SENDER_DEFAULT` | no | e.g. `hr@unity-software.online` |
| `SENDER_NAME_DEFAULT` | no | e.g. `Unity Software` |
| `INBOUND_FORWARD_TO` | for inbound | Where received mail is forwarded |
| `ASSET_BASE_URL` | no | Absolute image base for emails; defaults to the deployment origin |
| `SETUP_SECRET` | for `/api/r2-setup` | Secret header value protecting that endpoint |
| `R2_*` | for R2 only | Cloudflare R2 credentials |

## Send an email

```bash
curl -X POST https://<your-app>.vercel.app/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "template": "hr",                 # hr | hiring | director | generic
    "to": "jane@example.com",
    "toName": "Jane Doe",
    "subject": "Optional override",
    "vars": { "recipient_name": "Jane" }
  }'
```

Optional fields: `from` (`{email,name}`), `html` (custom body), `text`, `attachments[]` (`contentType`, `filename`, `base64`).

## Receive email (Mailjet Inbound Parsing)

1. In the Mailjet dashboard open **Inbound Parsing** and add a domain, e.g. `inbound.unity-software.online`.
2. Add the DNS records Mailjet provides (an MX to `inbound.mailjet.com` and an SPF TXT `v=spf1 include:spf.mailjet.com ~all`) — on Cloudflare this is under **DNS → Records**.
3. Create a route on that domain pointing to `https://<your-app>.vercel.app/api/inbound` (verify the webhook URL when Mailjet asks).
4. Mail addressed to `anything@inbound.unity-software.online` is now webhooked to the app and forwarded to `INBOUND_FORWARD_TO`.

## Cloudflare R2 assets (optional)

R2 needs to be enabled first in the Cloudflare dashboard (the API currently returns `10042 — enable R2 through the Cloudflare dashboard` while the service is not activated).

Once enabled, run this once (requires `R2_*` + `SETUP_SECRET` env vars):

```bash
curl -X POST https://<your-app>.vercel.app/api/r2-setup \
  -H "x-setup-secret: <SETUP_SECRET>" \
  -H "Content-Type: application/json" -d "{}"
```

It creates the bucket, uploads `header.jpg` + avatars, applies a public-read policy, and returns the `assetBase`. Set that as `ASSET_BASE_URL` and redeploy. (`tools/upload-assets.mjs` is the local equivalent.)

## Local development

```bash
# 1. copy .env.example to .env and fill values
node tools/test-send.mjs you@example.com "Jane" hr   # test a real send
node tools/smoke-templates.mjs                        # template engine checks
node tools/upload-assets.mjs                          # R2 upload (if R2 enabled)
```

Zero runtime dependencies — functions use Node's built-in `fetch` and `crypto`.

## Troubleshooting

- **`mj-0001 Your account has been temporarily blocked`** — Mailjet has blocked sending on the account; contact Mailjet support from the account dashboard. Everything else (templates, webhooks, deploy) works regardless.
- **Images don't load in a sent email** — emails need absolute image URLs; set `ASSET_BASE_URL` to the deployment origin (or R2 base).
- **Inbound not arriving** — confirm the MX record is live (`dig inbound.<domain> mx`), the route is active, and `INBOUND_FORWARD_TO` is set.
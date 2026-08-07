# Unity Inbox

Shared team email inbox for Unity Software.

## Features

- Compose & send with official letterhead (HR / Hiring / Director / General)
- Shared Inbox for the team
- Assign conversations to avoid confusion
- Starred, Sent folders
- Reply with letterhead
- Receive via MailerSend inbound webhook
- Tracking in Supabase

## Setup

1. Run `supabase-schema.sql` in Supabase SQL Editor
2. Copy `.env.example` → `.env.local` and fill in keys
3. `npm install && npm run dev`

## Deploy (Vercel)

Connect this repo to Vercel and set environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MAILERSEND_API_TOKEN`

Inbound webhook URL after deploy:
`https://your-domain.vercel.app/api/inbound`

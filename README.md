# Unity Software — Congratulatory Email Templates

Clean, professional letterhead emails for sending from different roles in the organisation.

## What’s included

| File | Purpose |
|------|---------|
| `index.html` | Preview page (open in browser) |
| `congrats-from-hr.html` | From HR Manager |
| `congrats-from-hiring.html` | From Hiring Manager |
| `congrats-from-director.html` | From Director |
| `congratulation-email.html` | Generic version with placeholders |
| `header.jpg` | Official letterhead banner |
| `avatar_hr.png` | Profile photo — HR |
| `avatar_hiring.png` | Profile photo — Hiring |
| `avatar_director.png` | Profile photo — Director |

## From addresses (use these in MailerSend)

- `hr@unity-software.online` → HR Manager
- `hiring@unity-software.online` → Hiring Manager
- `director@unity-software.online` → Director
- `hello@unity-software.online` → General / company

Because the domain is already verified, you can send from any of these addresses immediately. No extra setup needed.

## How to send via MailerSend API

1. Host the images (`header.jpg` + the three avatars) somewhere public (your website, S3, Cloudflare R2, etc.).
2. Update every `<img src="...">` in the HTML to the full public URL.
3. Replace `{{recipient_name}}` with the real name (or use MailerSend’s personalization).
4. Send with the matching From address and name.

Example From object:

```json
"from": {
  "email": "hr@unity-software.online",
  "name": "Amara Njoroge"
}
```

## Design notes

- Letterhead matches the provided Unity Software / Liceria & Co. banner.
- Signature block follows the clean card style you supplied.
- Typography uses system fonts for maximum compatibility and a native feel.
- Table-based layout for reliable rendering across Gmail, Outlook, Apple Mail, etc.
- Minimal colour (black, white, soft grey + the orange accent from the header).

## Receiving emails

MailerSend can receive mail via **Inbound Routes** (webhook or forward). It is not a traditional inbox.

Recommended setup:

- Keep real mailboxes (Google Workspace / Microsoft 365) for day-to-day reading.
- Use MailerSend only for **sending** these branded messages.
- Optionally set up an inbound route if you want replies parsed into an app.

## Customisation

Edit the body text, names, titles, or phone numbers directly in the HTML files. Keep the structure and spacing intact for best results.

export type Sender = { email: string; name: string; title: string }

/** Wide, clean promotional HTML for MailerSend (table-based, email-safe) */
export function buildPromotionalEmail(opts: {
  bodyHtml: string
  sender: Sender
  ctaUrl?: string
  ctaLabel?: string
  preheader?: string
}) {
  const { bodyHtml, sender, ctaUrl = 'https://www.unity-software.online', ctaLabel = 'Visit Unity Software', preheader = '' } = opts
  const headerUrl = 'https://emails-in-for-unity.vercel.app/header.jpg'

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Unity Software</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a { color: #1a73e8; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#eef1f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef1f6;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
          <!-- Letterhead -->
          <tr>
            <td style="padding:0;line-height:0;">
              <img src="${headerUrl}" alt="Unity Software — Kenya" width="640" style="display:block;width:100%;max-width:640px;height:auto;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 8px 40px;color:#1f2937;font-size:16px;line-height:1.65;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:8px 40px 28px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:980px;background:#0b57d0;">
                    <a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:980px;letter-spacing:0.01em;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0 0;font-size:13px;color:#6b7280;line-height:1.5;">
                Or visit <a href="https://www.unity-software.online" style="color:#0b57d0;text-decoration:none;">www.unity-software.online</a>
                · Call <a href="tel:+254778903044" style="color:#6b7280;text-decoration:none;">+254 778 903 044</a>
              </p>
            </td>
          </tr>
          <!-- Accent -->
          <tr>
            <td style="padding:0 40px 24px 40px;">
              <div style="height:3px;width:56px;background:linear-gradient(90deg,#f59e0b,#3b82f6);border-radius:2px;"></div>
            </td>
          </tr>
          <!-- Signature -->
          <tr>
            <td style="padding:0 40px 32px 40px;">
              <p style="margin:0 0 4px 0;font-size:15px;color:#374151;">Kind regards,</p>
              <p style="margin:0 0 2px 0;font-size:16px;font-weight:600;color:#111827;">${sender.name}</p>
              <p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;font-weight:500;">${sender.title} · Unity Software</p>
              <p style="margin:0;font-size:13px;line-height:1.55;color:#6b7280;">
                <a href="mailto:${sender.email}" style="color:#6b7280;text-decoration:none;">${sender.email}</a><br />
                <a href="tel:+254778903044" style="color:#6b7280;text-decoration:none;">+254 778 903 044</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;padding:28px 40px;">
              <p style="margin:0 0 6px 0;font-size:13px;font-weight:600;color:#f8fafc;letter-spacing:0.04em;">UNITY SOFTWARE</p>
              <p style="margin:0 0 12px 0;font-size:12px;line-height:1.5;color:#94a3b8;">Kenya · Nairobi · Logistics &amp; supply chain</p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                <a href="https://www.unity-software.online" style="color:#fbbf24;text-decoration:none;">www.unity-software.online</a>
                &nbsp;·&nbsp;
                <a href="mailto:hello@unity-software.online" style="color:#94a3b8;text-decoration:none;">hello@unity-software.online</a>
                &nbsp;·&nbsp;
                <a href="https://emails-in-for-unity.vercel.app/apply" style="color:#94a3b8;text-decoration:none;">Careers</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0 0;font-size:11px;color:#94a3b8;text-align:center;">
          Unity Software (Liceria &amp; Co.) · Nairobi, Kenya
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

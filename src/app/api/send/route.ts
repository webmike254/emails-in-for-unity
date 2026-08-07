import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, plainTextToHtml } from '@/lib/mailersend'
import { buildPromotionalEmail } from '@/lib/email-template'
import { getServiceSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      fromEmail = 'hello@unity-software.online',
      fromName = 'Unity Software',
      toEmail,
      toName,
      subject,
      html,
      text,
      plainBody,
      threadId,
      sentBy,
      title = 'Team',
      ctaUrl,
      ctaLabel,
      attachments,
    } = body

    if (!toEmail || !subject) {
      return NextResponse.json({ error: 'toEmail and subject required' }, { status: 400 })
    }

    const bodyHtml =
      html ||
      plainTextToHtml(plainBody || text || '')

    const finalHtml = buildPromotionalEmail({
      bodyHtml,
      sender: { email: fromEmail, name: fromName, title },
      ctaUrl: ctaUrl || 'https://www.unity-software.online',
      ctaLabel: ctaLabel || 'Visit Unity Software',
      preheader: subject,
    })

    const result = await sendEmail({
      fromEmail,
      fromName,
      toEmail,
      toName,
      subject,
      html: finalHtml,
      text: plainBody || text || bodyHtml.replace(/<[^>]+>/g, ' '),
      replyToEmail: fromEmail,
      replyToName: fromName,
      attachments: attachments || undefined,
    })

    const sb = getServiceSupabase()

    let tid = threadId
    if (!tid) {
      const { data: thread, error: te } = await sb
        .from('threads')
        .insert({
          subject,
          snippet: (plainBody || text || '').slice(0, 120),
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (te) throw te
      tid = thread.id
    } else {
      await sb
        .from('threads')
        .update({
          last_message_at: new Date().toISOString(),
          snippet: (plainBody || text || '').slice(0, 120),
        })
        .eq('id', tid)
    }

    const { data: msg, error: me } = await sb
      .from('messages')
      .insert({
        thread_id: tid,
        direction: 'outbound',
        mailersend_id: result.messageId,
        from_email: fromEmail,
        from_name: fromName,
        to_email: toEmail,
        to_name: toName || null,
        subject,
        body_html: finalHtml,
        body_text: plainBody || text || null,
        status: 'sent',
        is_read: true,
        sent_by: sentBy || null,
      })
      .select()
      .single()

    if (me) throw me

    await sb.from('contacts').upsert({ email: toEmail, name: toName || null }, { onConflict: 'email' })

    return NextResponse.json({ ok: true, messageId: result.messageId, threadId: tid, message: msg })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Send failed' }, { status: 500 })
  }
}

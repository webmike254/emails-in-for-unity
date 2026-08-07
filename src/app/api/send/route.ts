import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailersend'
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
      threadId,
      sentBy,
    } = body

    if (!toEmail || !subject || !html) {
      return NextResponse.json({ error: 'toEmail, subject, html required' }, { status: 400 })
    }

    const result = await sendEmail({
      fromEmail,
      fromName,
      toEmail,
      toName,
      subject,
      html,
      text,
      replyToEmail: fromEmail,
      replyToName: fromName,
    })
    const sb = getServiceSupabase()

    let tid = threadId
    if (!tid) {
      const { data: thread, error: te } = await sb
        .from('threads')
        .insert({
          subject,
          snippet: (text || html.replace(/<[^>]+>/g, ' ')).slice(0, 120),
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (te) throw te
      tid = thread.id
    } else {
      await sb.from('threads').update({ last_message_at: new Date().toISOString(), snippet: (text || '').slice(0, 120) }).eq('id', tid)
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
        body_html: html,
        body_text: text || null,
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

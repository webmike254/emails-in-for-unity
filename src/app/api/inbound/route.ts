import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

// MailerSend inbound webhook — receives parsed email JSON
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    // MailerSend inbound structure varies; handle common fields
    const data = payload.data || payload
    const fromEmail = data.from?.email || data.sender?.email || data.from_email || ''
    const fromName = data.from?.name || data.sender?.name || data.from_name || ''
    const toEmail = data.to?.[0]?.email || data.recipient?.email || data.to_email || 'hello@unity-software.online'
    const subject = data.subject || '(no subject)'
    const html = data.html || data.text_html || data.body?.html || ''
    const text = data.text || data.text_plain || data.body?.text || ''

    if (!fromEmail) {
      return NextResponse.json({ error: 'no from' }, { status: 400 })
    }

    const sb = getServiceSupabase()

    // Find or create thread by subject + participants (simple match)
    const { data: existing } = await sb
      .from('threads')
      .select('id')
      .ilike('subject', subject.replace(/^re:\s*/i, ''))
      .order('last_message_at', { ascending: false })
      .limit(1)

    let threadId = existing?.[0]?.id
    if (!threadId) {
      const { data: th, error } = await sb
        .from('threads')
        .insert({
          subject,
          snippet: (text || html.replace(/<[^>]+>/g, ' ')).slice(0, 120),
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (error) throw error
      threadId = th.id
    } else {
      await sb.from('threads').update({
        last_message_at: new Date().toISOString(),
        snippet: (text || '').slice(0, 120),
      }).eq('id', threadId)
    }

    await sb.from('messages').insert({
      thread_id: threadId,
      direction: 'inbound',
      from_email: fromEmail,
      from_name: fromName,
      to_email: toEmail,
      subject,
      body_html: html,
      body_text: text,
      status: 'received',
      is_read: false,
    })

    await sb.from('contacts').upsert({ email: fromEmail, name: fromName || null }, { onConflict: 'email' })

    return NextResponse.json({ ok: true, threadId })
  } catch (err: any) {
    console.error('inbound error', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

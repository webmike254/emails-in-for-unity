import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const sb = getServiceSupabase()
    const folder = req.nextUrl.searchParams.get('folder') || 'inbox'
    const assigned = req.nextUrl.searchParams.get('assigned')

    let q = sb
      .from('threads')
      .select('*, messages(id, direction, from_email, from_name, to_email, subject, is_read, created_at, status), assigned:team_members(id, name, email, color)')
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false })
      .limit(80)

    if (assigned) q = q.eq('assigned_to', assigned)

    const { data, error } = await q
    if (error) throw error

    // Filter by folder using messages
    let threads = data || []
    if (folder === 'inbox') {
      threads = threads.filter((t: any) => t.messages?.some((m: any) => m.direction === 'inbound'))
    } else if (folder === 'sent') {
      threads = threads.filter((t: any) => t.messages?.some((m: any) => m.direction === 'outbound'))
    } else if (folder === 'starred') {
      threads = threads.filter((t: any) => t.is_starred)
    }

    return NextResponse.json({ threads })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, assigned_to, is_starred, is_archived } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const updates: any = {}
    if (assigned_to !== undefined) updates.assigned_to = assigned_to
    if (is_starred !== undefined) updates.is_starred = is_starred
    if (is_archived !== undefined) updates.is_archived = is_archived

    const sb = getServiceSupabase()
    const { data, error } = await sb.from('threads').update(updates).eq('id', id).select().single()
    if (error) throw error
    return NextResponse.json({ thread: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

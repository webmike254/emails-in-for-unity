import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const sb = getServiceSupabase()
    const status = req.nextUrl.searchParams.get('status')
    let q = sb
      .from('applications')
      .select('*, assigned:team_members(id, name, email, color)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (status) q = q.eq('status', status)
    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ applications: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { kind = 'job', name, email, phone, position, company, message, resume_url } = body
    if (!name || !email) {
      return NextResponse.json({ error: 'name and email required' }, { status: 400 })
    }
    const sb = getServiceSupabase()
    const { data, error } = await sb
      .from('applications')
      .insert({
        kind,
        name,
        email,
        phone: phone || null,
        position: position || null,
        company: company || null,
        message: message || null,
        resume_url: resume_url || null,
        status: 'new',
        is_read: false,
      })
      .select()
      .single()
    if (error) throw error

    // also upsert contact
    await sb.from('contacts').upsert({ email, name }, { onConflict: 'email' })

    return NextResponse.json({ ok: true, application: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status, assigned_to, is_read } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const updates: any = {}
    if (status !== undefined) updates.status = status
    if (assigned_to !== undefined) updates.assigned_to = assigned_to
    if (is_read !== undefined) updates.is_read = is_read
    updates.updated_at = new Date().toISOString()
    const sb = getServiceSupabase()
    const { data, error } = await sb.from('applications').update(updates).eq('id', id).select().single()
    if (error) throw error
    return NextResponse.json({ application: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

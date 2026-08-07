import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  try {
    const sb = getServiceSupabase()
    const { data, error } = await sb.from('team_members').select('*').order('name')
    if (error) throw error
    return NextResponse.json({ members: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

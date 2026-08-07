import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(url, anon)

export function getServiceSupabase() {
  if (!service) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

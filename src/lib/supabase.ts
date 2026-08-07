import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _anon: SupabaseClient | null = null
let _service: SupabaseClient | null = null

export function getSupabase() {
  if (_anon) return _anon
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY')
  _anon = createClient(url, key)
  return _anon
}

export function getServiceSupabase() {
  if (_service) return _service
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or URL')
  _service = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _service
}

// Back-compat alias (lazy)
export const supabase = {
  from: (...args: Parameters<SupabaseClient['from']>) => getSupabase().from(...args),
}

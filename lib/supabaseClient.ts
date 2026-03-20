import { createClient, type SupportedStorage } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const safeStorage: SupportedStorage = {
  getItem(key: string) {
    if (typeof window === 'undefined') return null

    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },

  setItem(key: string, value: string) {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem(key, value)
    } catch {}
  },

  removeItem(key: string) {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.removeItem(key)
    } catch {}
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})
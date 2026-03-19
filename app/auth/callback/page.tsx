'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
  useEffect(() => {
    async function handleAuth() {
      const url = new URL(window.location.href)

      const error = url.searchParams.get('error')
      const errorCode = url.searchParams.get('error_code')
      const code = url.searchParams.get('code')

      if (error) {
        window.location.replace(`/login?error=${encodeURIComponent(errorCode || error)}`)
        return
      }

      if (!code) {
        window.location.replace('/login')
        return
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        window.location.replace(`/login?error=${encodeURIComponent(exchangeError.message)}`)
        return
      }

      window.location.replace('/reset-password')
    }

    handleAuth()
  }, [])

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Bitte warten...
    </div>
  )
}
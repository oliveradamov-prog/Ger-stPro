'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    async function handleAuth() {
      const url = new URL(window.location.href)

      const error = url.searchParams.get('error')
      const errorCode = url.searchParams.get('error_code')
      const code = url.searchParams.get('code')

      if (error) {
        router.replace(`/login?error=${encodeURIComponent(errorCode || error)}`)
        return
      }

      if (!code) {
        router.replace('/login')
        return
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        router.replace(`/login?error=${encodeURIComponent(exchangeError.message)}`)
        return
      }

      // Mivel ezt a callback oldalt a reset-password flow használja,
      // sikeres session exchange után mindig a reset-password oldalra megyünk.
      router.replace('/reset-password')
    }

    handleAuth()
  }, [router])

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Bitte warten...
    </div>
  )
}
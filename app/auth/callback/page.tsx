'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function handleAuth() {
      const error = searchParams.get('error')
      const errorCode = searchParams.get('error_code')
      const code = searchParams.get('code')
      const type = searchParams.get('type')

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

      if (type === 'recovery') {
        router.replace('/reset-password')
        return
      }

      router.replace('/login')
    }

    handleAuth()
  }, [router, searchParams])

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Bitte warten...
    </div>
  )
}
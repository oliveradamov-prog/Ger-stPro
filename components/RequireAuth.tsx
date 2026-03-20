'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type RequireAuthProps = {
  children: React.ReactNode
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let mounted = true

    async function checkAuth() {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error || !data.session) {
        setAllowed(false)
        setChecking(false)
        router.replace('/login')
        return
      }

      setAllowed(true)
      setChecking(false)
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return

      if (!session) {
        setAllowed(false)
        setChecking(false)
        router.replace('/login')
        return
      }

      setAllowed(true)
      setChecking(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  if (checking) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text)',
          fontWeight: 800,
        }}
      >
        Bitte warten...
      </div>
    )
  }

  if (!allowed) return null

  return <>{children}</>
}
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
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (session) {
          setAllowed(true)
          setChecking(false)
        } else {
          setAllowed(false)
          setChecking(false)
          router.replace('/login')
        }
      } catch {
        if (!mounted) return
        setAllowed(false)
        setChecking(false)
        router.replace('/login')
      }
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return

      if (session) {
        setAllowed(true)
        setChecking(false)
      } else {
        setAllowed(false)
        setChecking(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  useEffect(() => {
    if (!checking && !allowed) {
      router.replace('/login')
    }
  }, [checking, allowed, router])

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
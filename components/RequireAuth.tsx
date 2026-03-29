'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type RequireAuthProps = {
  children: React.ReactNode
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let mounted = true

    async function run() {
      try {
        setChecking(true)

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (!mounted) return

        if (error) {
          console.error('RequireAuth getUser error:', error)
          setAllowed(false)
          if (pathname !== '/login') {
            router.replace('/login')
          }
          return
        }

        if (user) {
          setAllowed(true)
        } else {
          setAllowed(false)
          if (pathname !== '/login') {
            router.replace('/login')
          }
        }
      } catch (err) {
        console.error('RequireAuth unexpected error:', err)
        if (!mounted) return
        setAllowed(false)
        if (pathname !== '/login') {
          router.replace('/login')
        }
      } finally {
        if (mounted) {
          setChecking(false)
        }
      }
    }

    run()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return

      if (session?.user) {
        setAllowed(true)
        setChecking(false)
      } else {
        setAllowed(false)
        setChecking(false)
        if (pathname !== '/login') {
          router.replace('/login')
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router, pathname])

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
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
      if (mounted) setChecking(true)

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error('RequireAuth getSession error:', error)
          setAllowed(false)
          if (pathname !== '/login') {
            router.replace('/login')
          }
          return
        }

        if (session?.user) {
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

    async function handleFocus() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (session?.user) {
          setAllowed(true)
        } else {
          setAllowed(false)
          if (pathname !== '/login') {
            router.replace('/login')
          }
        }
      } catch (err) {
        console.error('RequireAuth focus refresh error:', err)
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        handleFocus()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mounted = false
      subscription.unsubscribe()
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [router, pathname])

  if (checking) {
    return (
      <div style={{ padding: '1rem', color: 'var(--muted)' }}>
        Bitte warten…
      </div>
    )
  }

  if (!allowed) return null

  return <>{children}</>
}
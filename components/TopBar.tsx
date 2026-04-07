'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Profile = {
  full_name: string | null
  logo_url: string | null
}

export default function TopBar() {
  const pathname = usePathname()
  const router = useRouter()

  const [menuOpen, setMenuOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [loadingUser, setLoadingUser] = useState(true)

  const shouldHide =
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/auth/callback'

  useEffect(() => {
    let active = true

    async function loadSessionAndProfile() {
      try {
        setLoadingUser(true)

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!active) return

        if (!user) {
          setDisplayName('')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, logo_url')
          .eq('id', user.id)
          .maybeSingle()

        const profileData = profile as Profile | null
        const name = profileData?.full_name?.trim() || user.email || ''

        setDisplayName(name)
      } catch {
        if (!active) return
        setDisplayName('')
      } finally {
        if (active) setLoadingUser(false)
      }
    }

    loadSessionAndProfile()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setDisplayName('')
        setLoadingUser(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, logo_url')
        .eq('id', session.user.id)
        .maybeSingle()

      const profileData = profile as Profile | null
      const name = profileData?.full_name?.trim() || session.user.email || ''

      setDisplayName(name)
      setLoadingUser(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function logout() {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setMenuOpen(false)
      setDisplayName('')
      setLoadingUser(false)
      router.replace('/login')
      router.refresh()
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="left">
          <button
            className="menuBtn"
            type="button"
            aria-label="Menü öffnen"
            onClick={() => setMenuOpen((v) => !v)}
          >
            ☰
          </button>

          <Link href="/" className="brand" onClick={() => setMenuOpen(false)}>
            GerüstPro
          </Link>
        </div>

        <div className="right">
          {!loadingUser && displayName ? (
            <>
              <span className="userName">{displayName}</span>
              <button className="loginLink" type="button" onClick={logout}>
                Abmelden
              </button>
            </>
          ) : (
            <Link href="/login" className="loginLink">
              Anmelden
            </Link>
          )}
        </div>
      </div>

      {menuOpen ? (
        <div className="mobileMenu">
          <Link
            href="/projects"
            className="mobileMenuItem"
            onClick={() => setMenuOpen(false)}
          >
            Projekte
          </Link>

          <Link
            href="/projects/new"
            className="mobileMenuItem"
            onClick={() => setMenuOpen(false)}
          >
            Neues Projekt
          </Link>

          {!loadingUser && displayName ? (
            <button
              type="button"
              className="mobileMenuItem"
              onClick={logout}
            >
              Abmelden
            </button>
          ) : (
            <Link
              href="/login"
              className="mobileMenuItem"
              onClick={() => setMenuOpen(false)}
            >
              Anmelden
            </Link>
          )}
        </div>
      ) : null}

      <style jsx>{`
        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.03);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand {
          color: var(--text);
          text-decoration: none;
          font-weight: 950;
          font-size: 18px;
        }

        .menuBtn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--chip);
          color: var(--text);
          cursor: pointer;
          font-size: 24px;
        }

        .right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .userName {
          color: var(--muted);
          font-weight: 800;
          font-size: 13px;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .loginLink {
          border: 1px solid var(--border);
          background: var(--chip);
          color: var(--text);
          padding: 10px 14px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 900;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          cursor: pointer;
        }

        .mobileMenu {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 12px 16px 14px;
          border-bottom: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.03);
        }

        .mobileMenuItem {
          border: 1px solid var(--border);
          background: var(--chip);
          color: var(--text);
          text-decoration: none;
          border-radius: 12px;
          min-height: 44px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          font-weight: 900;
          text-align: left;
          cursor: pointer;
          width: 100%;
          box-sizing: border-box;
          appearance: none;
          -webkit-appearance: none;
        }

        .mobileMenuItem:hover {
          text-decoration: underline;
        }

        @media (max-width: 720px) {
          .userName {
            display: none;
          }
        }
      `}</style>
    </>
  )
}
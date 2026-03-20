'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function TopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [loadingUser, setLoadingUser] = useState(true)

  const shouldHide =
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/auth/callback'

  useEffect(() => {
    let active = true

    async function loadSession() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!active) return
        setEmail(user?.email || '')
      } catch {
        if (!active) return
        setEmail('')
      } finally {
        if (active) setLoadingUser(false)
      }
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email || '')
      setLoadingUser(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (shouldHide) return null

  async function logout() {
    await supabase.auth.signOut()
    setMenuOpen(false)
    window.location.href = '/login'
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
          {!loadingUser && email ? (
            <>
              <span className="email">{email}</span>
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

          {!loadingUser && email ? (
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

        .email {
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
          .email {
            display: none;
          }
        }
      `}</style>
    </>
  )
}
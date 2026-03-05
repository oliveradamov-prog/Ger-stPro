'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function TopBar() {
  const pathname = usePathname()

  const [email, setEmail] = useState<string | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  const isLogPage = useMemo(() => {
    // log oldalakon (pl. /projects/.../logs/...)
    return pathname?.includes('/logs/')
  }, [pathname])

  useEffect(() => {
    // theme init
    const saved = (typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null) as
      | 'light'
      | 'dark'
      | null
    const initial = saved ?? 'light'
    setTheme(initial)
    applyTheme(initial)
  }, [])

  useEffect(() => {
    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    // útvonal váltásnál zárjuk a menüt
    setMenuOpen(false)
  }, [pathname])

  // ESC = close drawer
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    if (menuOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  // lock body scroll while drawer open
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (menuOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    setEmail(user?.email ?? null)
    setLoadingUser(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  function shortEmail(e: string) {
    if (e.length <= 22) return e
    return e.slice(0, 10) + '...' + e.slice(-8)
  }

  function initialsFromEmail(e: string) {
    const ch = (e?.trim()?.[0] ?? '?').toUpperCase()
    return ch
  }

  function applyTheme(t: 'light' | 'dark') {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (t === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
    window.localStorage.setItem('theme', next)
  }

  function exportPdf() {
    // Itt most a print fallback
    window.print()
  }

  return (
    <>
      {/* GLOBAL THEME (whole app) */}
      <style jsx global>{`
        :root {
          /* Light */
          --bg: #fbfbfd;
          --surface: rgba(255, 255, 255, 0.72);
          --surface2: rgba(255, 255, 255, 0.92);
          --card: rgba(255, 255, 255, 0.86);

          --text: #0b1220;
          --muted: rgba(11, 18, 32, 0.62);

          --border: rgba(11, 18, 32, 0.12);
          --border2: rgba(11, 18, 32, 0.18);

          --shadow: 0 14px 44px rgba(2, 6, 23, 0.10);
          --shadow2: 0 8px 22px rgba(2, 6, 23, 0.12);

          --chip: rgba(11, 18, 32, 0.05);

          --primary-bg: #0b0b0b;
          --primary-text: #ffffff;

          --ring: rgba(59, 130, 246, 0.45);
          --link: #1d4ed8;
        }

        html.dark {
          /* Dark */
          --bg: #0b0f19;
          --surface: rgba(10, 14, 26, 0.62);
          --surface2: rgba(10, 14, 26, 0.88);
          --card: rgba(255, 255, 255, 0.06);

          --text: rgba(255, 255, 255, 0.92);
          --muted: rgba(255, 255, 255, 0.62);

          --border: rgba(255, 255, 255, 0.12);
          --border2: rgba(255, 255, 255, 0.18);

          --shadow: 0 18px 60px rgba(0, 0, 0, 0.46);
          --shadow2: 0 10px 28px rgba(0, 0, 0, 0.35);

          --chip: rgba(255, 255, 255, 0.06);

          --primary-bg: #ffffff;
          --primary-text: #0b0b0b;

          --ring: rgba(147, 197, 253, 0.40);
          --link: #93c5fd;
        }

        :global(html) {
          color-scheme: light;
        }
        :global(html.dark) {
          color-scheme: dark;
        }

        html,
        body {
          background: var(--bg);
          color: var(--text);
        }

        a {
          color: var(--link);
        }

        /* nicer focus */
        button:focus-visible,
        a:focus-visible {
          outline: 2px solid var(--ring);
          outline-offset: 2px;
          border-radius: 12px;
        }

        /* Print: always white paper */
        @media print {
          html,
          body,
          html.dark {
            background: #fff !important;
            color: #111 !important;
          }
          a {
            color: #111 !important;
            text-decoration: none !important;
          }
        }
      `}</style>

      <header className="topbar">
        <div className="wrap">
          <div className="left">
            <button className="burger" aria-label="Open menu" onClick={() => setMenuOpen(true)} type="button">
              ☰
            </button>

            <Link className="brand" href="/">
              <span className="logo">🏗️</span>
              <span className="brandText">Daily Log Builder</span>
            </Link>

            <nav className="nav">
              <Link href="/projects">Projects</Link>
              <Link href="/upgrade">Upgrade</Link>
            </nav>
          </div>

          <div className="right">
            {!loadingUser && (
              <>
                <button className="ghost" onClick={toggleTheme} type="button" title="Toggle theme">
                  {theme === 'dark' ? '☀️' : '🌙'}
                </button>

                {email ? (
                  <>
                    {isLogPage ? (
                      <button className="ghost" onClick={exportPdf} type="button" title="Export PDF">
                        📄
                      </button>
                    ) : null}

                    <div className="user">
                      <div className="avatar" aria-hidden="true">
                        {initialsFromEmail(email)}
                      </div>
                      <span className="email">{shortEmail(email)}</span>
                    </div>

                    <button className="primary" onClick={logout} type="button">
                      Log out
                    </button>
                  </>
                ) : (
                  <Link className="primaryLink" href="/login">
                    Sign in
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div className={`overlay ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)} />

      <aside className={`drawer ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen}>
        <div className="drawerTop">
          <div className="drawerBrand">
            <span className="logo">🏗️</span>
            <span style={{ fontWeight: 900 }}>Daily Log Builder</span>
          </div>
          <button className="close" onClick={() => setMenuOpen(false)} type="button" aria-label="Close menu">
            ✕
          </button>
        </div>

        <div className="drawerBody">
          <div className="drawerSection">
            <Link className="drawerLink" href="/projects">
              Projects
            </Link>
            <Link className="drawerLink" href="/upgrade">
              Upgrade
            </Link>
          </div>

          <div className="drawerSection">
            <button className="drawerBtn" onClick={toggleTheme} type="button">
              {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
            </button>

            {isLogPage ? (
              <button className="drawerBtn" onClick={exportPdf} type="button">
                📄 Export PDF
              </button>
            ) : null}
          </div>

          <div className="drawerSection">
            {email ? (
              <>
                <div className="drawerUser">
                  <div className="avatar">{initialsFromEmail(email)}</div>
                  <div className="drawerUserMeta">
                    <div style={{ fontWeight: 900 }}>Signed in</div>
                    <div style={{ color: 'var(--muted)' }}>{shortEmail(email)}</div>
                  </div>
                </div>

                <button className="drawerLogout" onClick={logout} type="button">
                  Log out
                </button>
              </>
            ) : (
              <Link className="drawerLogout" href="/login">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </aside>

      <style jsx>{`
        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: var(--text);
          font-weight: 950;
          white-space: nowrap;
        }

        .brandText {
          font-size: 18px;
          letter-spacing: 0.2px;
        }

        .logo {
          font-size: 18px;
        }

        .nav {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
        }

        .nav :global(a) {
          color: var(--text);
          text-decoration: none;
          padding: 7px 10px;
          border-radius: 12px;
          border: 1px solid transparent;
        }

        .nav :global(a:hover) {
          background: var(--chip);
          border-color: var(--border);
        }

        .right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .user {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          padding: 6px 10px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--card);
          box-shadow: var(--shadow2);
        }

        .email {
          font-size: 13px;
          color: var(--muted);
          max-width: 160px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .avatar {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: var(--chip);
          border: 1px solid var(--border);
          display: grid;
          place-items: center;
          font-weight: 900;
          color: var(--text);
          flex-shrink: 0;
        }

        .ghost {
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--text);
          padding: 7px 10px;
          border-radius: 14px;
          cursor: pointer;
          box-shadow: var(--shadow2);
        }

        .ghost:hover {
          background: var(--chip);
        }

        .primary {
          background: var(--primary-bg);
          color: var(--primary-text);
          border: 1px solid transparent;
          padding: 8px 14px;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 800;
          box-shadow: var(--shadow2);
        }

        .primary:hover {
          opacity: 0.92;
        }

        .primaryLink {
          background: var(--primary-bg);
          color: var(--primary-text);
          text-decoration: none;
          padding: 8px 14px;
          border-radius: 14px;
          font-weight: 800;
          box-shadow: var(--shadow2);
        }

        .burger {
          display: none;
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--text);
          padding: 7px 10px;
          border-radius: 14px;
          cursor: pointer;
          box-shadow: var(--shadow2);
        }

        /* Drawer + overlay */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
          z-index: 60;
        }

        .overlay.show {
          opacity: 1;
          pointer-events: auto;
        }

        .drawer {
          position: fixed;
          top: 0;
          right: 0;
          height: 100vh;
          width: min(86vw, 360px);
          background: var(--surface2);
          border-left: 1px solid var(--border);
          transform: translateX(110%);
          transition: transform 0.2s ease;
          z-index: 70;
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .drawer.open {
          transform: translateX(0);
        }

        .drawerTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-bottom: 1px solid var(--border);
        }

        .drawerBrand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .close {
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--text);
          padding: 7px 10px;
          border-radius: 14px;
          cursor: pointer;
          box-shadow: var(--shadow2);
        }

        .drawerBody {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .drawerSection {
          border: 1px solid var(--border);
          background: var(--card);
          border-radius: 16px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: var(--shadow2);
        }

        .drawerLink {
          color: var(--text);
          text-decoration: none;
          padding: 10px 10px;
          border-radius: 14px;
          background: var(--chip);
          border: 1px solid var(--border);
          font-weight: 800;
        }

        .drawerLink:hover {
          border-color: var(--border2);
        }

        .drawerBtn {
          padding: 10px 10px;
          border-radius: 14px;
          background: var(--chip);
          border: 1px solid var(--border);
          color: var(--text);
          cursor: pointer;
          text-align: left;
          font-weight: 800;
        }

        .drawerBtn:hover {
          border-color: var(--border2);
        }

        .drawerUser {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: var(--chip);
          border: 1px solid var(--border);
          border-radius: 14px;
        }

        .drawerUserMeta {
          min-width: 0;
        }

        .drawerLogout {
          padding: 10px 10px;
          border-radius: 14px;
          background: var(--primary-bg);
          color: var(--primary-text);
          border: 1px solid transparent;
          cursor: pointer;
          font-weight: 900;
          text-decoration: none;
          text-align: center;
          box-shadow: var(--shadow2);
        }

        .drawerLogout:hover {
          opacity: 0.92;
        }

        /* Responsive rules */
        @media (max-width: 720px) {
          .burger {
            display: inline-flex;
          }
          .nav {
            display: none;
          }
          .email {
            display: none;
          }
          .primary {
            display: none;
          }
          .ghost {
            display: none;
          }
          .user {
            display: none;
          }
          .primaryLink {
            display: none;
          }
        }

        /* Print: topbar rejtése PDF-nél */
        @media print {
          .topbar,
          .drawer,
          .overlay {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}
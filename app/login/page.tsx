'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    setBusy(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMsg(error.message)
      setBusy(false)
      return
    }

    router.push('/projects')
    router.refresh()
  }

  async function signUp() {
    setMsg('')
    setBusy(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMsg(error.message)
    } else {
      setMsg('Account erstellt. Jetzt bitte anmelden.')
    }

    setBusy(false)
  }

  return (
    <main className="loginPage">
      <div className="loginCard">
        <div className="badge">GerüstPro</div>
        <h1>Login</h1>
        <p className="subtext">Melde dich an, um Projekte und Tagesberichte zu verwalten.</p>

        <form onSubmit={signIn} className="form">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Passwort</label>
            <input
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="********"
              autoComplete="current-password"
            />
          </div>

          <button className="primaryBtn" type="submit" disabled={busy}>
            {busy ? 'Bitte warten…' : 'Sign In'}
          </button>
        </form>
        
        <Link href="/forgot-password" className="text-sm underline">
          Passwort vergessen?
        </Link>
        
        <button className="secondaryBtn" onClick={signUp} disabled={busy} type="button">
          Create account
        </button>

        {msg ? <div className="message">{msg}</div> : null}
      </div>

      <style jsx>{`
        .loginPage {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px 40px;
          box-sizing: border-box;
        }

        .loginCard {
          width: 100%;
          max-width: 460px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: var(--shadow);
          border-radius: 24px;
          padding: 22px;
          color: var(--text);
          backdrop-filter: blur(8px);
        }

        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.05);
          color: var(--muted);
          font-weight: 900;
          font-size: 13px;
          margin-bottom: 12px;
        }

        h1 {
          margin: 0;
          font-size: 46px;
          line-height: 1;
          font-weight: 950;
          color: var(--text);
        }

        .subtext {
          margin: 12px 0 20px;
          color: var(--muted);
          font-weight: 700;
          line-height: 1.45;
        }

        .form {
          display: grid;
          gap: 14px;
        }

        .field {
          display: grid;
          gap: 8px;
        }

        label {
          color: var(--text);
          font-weight: 900;
          font-size: 15px;
        }

        input {
          width: 100%;
          min-height: 50px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.07);
          color: var(--text);
          padding: 12px 14px;
          box-sizing: border-box;
          outline: none;
          font-size: 16px;
        }

        input::placeholder {
          color: rgba(255, 255, 255, 0.42);
        }

        input:focus {
          border-color: rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.09);
        }

        .primaryBtn,
        .secondaryBtn {
          width: 100%;
          min-height: 50px;
          border-radius: 14px;
          border: 1px solid var(--border);
          cursor: pointer;
          font-weight: 950;
          font-size: 16px;
          transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
        }

        .primaryBtn {
          margin-top: 6px;
          background: rgba(255, 255, 255, 0.12);
          color: var(--text);
        }

        .secondaryBtn {
          margin-top: 12px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text);
        }

        .primaryBtn:hover,
        .secondaryBtn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
        }

        .primaryBtn:disabled,
        .secondaryBtn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .message {
          margin-top: 14px;
          color: #ffb3b3;
          font-weight: 800;
          line-height: 1.45;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        @media (max-width: 720px) {
          .loginPage {
            align-items: flex-start;
            padding-top: 18px;
          }

          .loginCard {
            padding: 18px;
            border-radius: 20px;
          }

          h1 {
            font-size: 38px;
          }
        }
      `}</style>
    </main>
  )
}
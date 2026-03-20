'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function prepareRecovery() {
      try {
        const url = new URL(window.location.href)
        const error = url.searchParams.get('error')
        const errorCode = url.searchParams.get('error_code')

        if (error) {
          setMsg(`Fehler: ${errorCode || error}`)
          setChecking(false)
          return
        }

        // 🔥 FONTOS: URL tisztítás
        window.history.replaceState({}, '', '/reset-password')

        const { data, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !data.session) {
          setMsg('Der Zurücksetzungslink ist ungültig oder abgelaufen.')
          setChecking(false)
          return
        }

        setReady(true)
      } catch {
        setMsg('Beim Laden der Passwort-Zurücksetzung ist ein Fehler aufgetreten.')
      } finally {
        setChecking(false)
      }
    }

    prepareRecovery()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMsg(error.message)
    } else {
      setMsg('Passwort erfolgreich geändert. Weiterleitung zum Login...')
      setTimeout(() => {
        router.replace('/login')
      }, 1500)
    }

    setBusy(false)
  }

  return (
    <div className="loginPage">
      <div className="card">
        <div className="brand">GerüstPro</div>
        <h1>Neues Passwort</h1>
        <p className="subtitle">Gib hier dein neues Passwort ein.</p>

        {checking ? (
          <div className="message">Bitte warten...</div>
        ) : ready ? (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="password">Neues Passwort</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                autoComplete="new-password"
                required
              />
            </div>

            <button className="primaryBtn" type="submit" disabled={busy}>
              {busy ? 'Bitte warten…' : 'Passwort speichern'}
            </button>
          </form>
        ) : null}

        <Link href="/login" className="textLink">
          Zurück zum Login
        </Link>

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
          background:
            radial-gradient(circle at top, #0f172a 0%, #020617 45%, #01030a 100%);
        }

        .card {
          width: 100%;
          max-width: 460px;
          border-radius: 28px;
          padding: 22px 16px 22px;
          background: rgba(15, 23, 42, 0.88);
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: 0 18px 50px rgba(2, 6, 23, 0.55);
          backdrop-filter: blur(8px);
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 800;
          color: #e5e7eb;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 8px 14px;
          border-radius: 999px;
          margin-bottom: 14px;
        }

        h1 {
          margin: 0 0 10px;
          font-size: 32px;
          line-height: 1.05;
          color: #f8fafc;
          font-weight: 900;
        }

        .subtitle {
          margin: 0 0 20px;
          color: #a1a1aa;
          font-size: 15px;
          line-height: 1.5;
          font-weight: 700;
        }

        form {
          display: grid;
          gap: 16px;
        }

        .field {
          display: grid;
          gap: 8px;
        }

        label {
          color: #f3f4f6;
          font-weight: 800;
          font-size: 14px;
        }

        input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.08);
          color: #f8fafc;
          border-radius: 16px;
          padding: 14px 14px;
          font-size: 16px;
          outline: none;
        }

        input::placeholder {
          color: #a1a1aa;
        }

        .primaryBtn {
          width: 100%;
          border: 0;
          border-radius: 16px;
          padding: 14px 16px;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.14);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .primaryBtn:disabled {
          opacity: 0.7;
          cursor: default;
        }

        .textLink {
          display: inline-block;
          margin-top: 14px;
          color: #d4d4d8;
          text-decoration: underline;
          font-size: 14px;
          font-weight: 700;
        }

        .message {
          margin-top: 16px;
          color: #e5e7eb;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 14px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  )
}
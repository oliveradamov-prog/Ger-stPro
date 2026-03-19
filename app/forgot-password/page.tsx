'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://ger-st-pro.vercel.app/reset-password',
    })

    if (error) {
      setMsg(error.message)
    } else {
      setMsg('Ha létezik ilyen email-cím, elküldtük a jelszó-visszaállító linket.')
    }

    setBusy(false)
  }

  return (
    <div className="loginPage">
      <div className="card">
        <div className="brand">GerüstPro</div>
        <h1>Passwort vergessen</h1>
        <p className="subtitle">
          Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen deines Passworts.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              autoComplete="email"
              required
            />
          </div>

          <button className="primaryBtn" type="submit" disabled={busy}>
            {busy ? 'Bitte warten…' : 'Reset-Link senden'}
          </button>
        </form>

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
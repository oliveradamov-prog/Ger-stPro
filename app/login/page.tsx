'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'


const PROFILE_LOGO_BUCKET = 'project-logos'

export default function LoginPage() {
  const router = useRouter()

  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function signIn(e: React.FormEvent) {
    e.preventDefault()

    if (busy) return

    const trimmedEmail = email.trim()
    setMsg('')

    if (!trimmedEmail) {
      setMsg('Bitte Email eingeben.')
      return
    }

    if (!password) {
      setMsg('Bitte Passwort eingeben.')
      return
    }

    setBusy(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (error) {
        setMsg(error.message)
        return
      }

      router.replace('/projects')
    } catch (err: any) {
      setMsg(err?.message ?? 'Anmeldung fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  async function uploadProfileLogo(userId: string, file: File) {
    const ext = file.name.split('.').pop() || 'png'
    const safeExt = ext.toLowerCase()
    const path = `${userId}/profile-logo-${Date.now()}.${safeExt}`

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_LOGO_BUCKET)
      .upload(path, file, {
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from(PROFILE_LOGO_BUCKET)
      .getPublicUrl(path)

    return data.publicUrl
  }

  async function signUp() {
    setMsg('')
    setBusy(true)

    try {
      const trimmedName = fullName.trim()
      const trimmedEmail = email.trim().toLowerCase()

      if (!trimmedName) {
        throw new Error('Bitte deinen Namen eingeben.')
      }

      if (!trimmedEmail) {
        throw new Error('Bitte deine Email eingeben.')
      }

      if (!password || password.length < 6) {
        throw new Error('Das Passwort muss mindestens 6 Zeichen haben.')
      }

      const { data: signUpData, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
          },
        },
      })

      if (error) throw error

      const user = signUpData.user
      if (!user) {
        throw new Error('Account wurde nicht erstellt.')
      }

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: trimmedName,
        logo_url: null,
      })

      if (profileError) throw profileError

      if (logoFile) {
        const logoUrl = await uploadProfileLogo(user.id, logoFile)

        const { error: logoUpdateError } = await supabase.from('profiles').upsert({
          id: user.id,
          full_name: trimmedName,
          logo_url: logoUrl,
        })

        if (logoUpdateError) throw logoUpdateError
      }

      setMsg('Account erstellt. Jetzt bitte anmelden.')
      setMode('login')
      setPassword('')
      setLogoFile(null)
    } catch (e: any) {
      setMsg(e?.message ?? 'Registrierung fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="loginPage">
      <div className="loginCard">
        <div className="badge">GerüstPro</div>

        <div className="modeSwitch">
          <button
            type="button"
            className={mode === 'login' ? 'modeBtn active' : 'modeBtn'}
            onClick={() => {
              setMsg('')
              setMode('login')
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'modeBtn active' : 'modeBtn'}
            onClick={() => {
              setMsg('')
              setMode('signup')
            }}
          >
            Registrieren
          </button>
        </div>

        <h1>{mode === 'login' ? 'Login' : 'Account erstellen'}</h1>
        <p className="subtext">
          {mode === 'login'
            ? 'Melde dich an, um Projekte und Tagesberichte zu verwalten.'
            : 'Erstelle einen Account mit Namen und optionalem Firmenlogo.'}
        </p>

        {mode === 'login' ? (
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
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
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
                spellCheck={false}
              />
            </div>

            <button className="primaryBtn" type="submit" disabled={busy}>
              {busy ? 'Bitte warten…' : 'Anmelden'}
            </button>
          </form>
        ) : (
          <div className="form">
            <div className="field">
              <label htmlFor="fullName">Dein Name</label>
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="z. B. Oliver Adamov"
                autoComplete="name"
              />
            </div>

            <div className="field">
              <label htmlFor="signupEmail">Email</label>
              <input
                id="signupEmail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <div className="field">
              <label htmlFor="signupPassword">Passwort</label>
              <input
                id="signupPassword"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Mindestens 6 Zeichen"
                autoComplete="new-password"
                spellCheck={false}
              />
            </div>

            <div className="field">
              <label htmlFor="logo">Firmenlogo (optional)</label>
              <input
                id="logo"
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />
            </div>

            <button className="primaryBtn" onClick={signUp} disabled={busy} type="button">
              {busy ? 'Bitte warten…' : 'Create account'}
            </button>
          </div>
        )}

        <Link href="/forgot-password" className="forgotLink">
          Passwort vergessen?
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

        .modeSwitch {
          display: flex;
          gap: 10px;
          margin-bottom: 14px;
        }

        .modeBtn {
          flex: 1;
          min-height: 42px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text);
          cursor: pointer;
          font-weight: 900;
        }

        .modeBtn.active {
          background: rgba(255, 255, 255, 0.12);
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

        .primaryBtn {
          width: 100%;
          min-height: 50px;
          border-radius: 14px;
          border: 1px solid var(--border);
          cursor: pointer;
          font-weight: 950;
          font-size: 16px;
          margin-top: 6px;
          background: rgba(255, 255, 255, 0.12);
          color: var(--text);
          transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
        }

        .primaryBtn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
        }

        .primaryBtn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .forgotLink {
          display: inline-block;
          margin-top: 14px;
          color: var(--text);
          text-decoration: underline;
          font-weight: 700;
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
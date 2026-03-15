'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function NewProjectPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    name: '',
    location: '',
    client: '',
  })

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function createProject() {
    try {
      setMsg('')

      const name = form.name.trim()
      const location = form.location.trim()
      const client = form.client.trim()

      if (!name) {
        throw new Error('Bitte Projektname eingeben.')
      }

      setSaving(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Nicht angemeldet.')
      }

      const payload = {
        name,
        location: location || null,
        client: client || null,
        user_id: user.id,
      }

      const { data, error } = await supabase
        .from('projects')
        .insert(payload)
        .select('id')
        .single()

      if (error) throw error
      if (!data?.id) throw new Error('Projekt konnte nicht erstellt werden.')

      router.push('/projects')
      router.refresh()
    } catch (e: any) {
      setMsg(e?.message ?? 'Projekt-Erstellung fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="topRow">
        <Link className="backLink" href="/projects">
          ← Zurück zu Projekten
        </Link>
      </div>

      <div className="hero">
        <div className="kicker">GerüstPro</div>
        <h1 className="h1">Neues Projekt</h1>
        <p className="lead">
          Projektname, Standort und Auftraggeber eingeben, dann das Projekt direkt
          in der Liste speichern.
        </p>
      </div>

      {msg ? <div className="error">{msg}</div> : null}

      <div className="card">
        <div className="field">
          <label className="label" htmlFor="name">
            Projektname <span className="req">*</span>
          </label>
          <input
            id="name"
            className="input"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="z. B. Gerüstbau Leuna"
            autoFocus
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="location">
            Standort / Baustelle
          </label>
          <input
            id="location"
            className="input"
            value={form.location}
            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            placeholder="z. B. Bad Dürrenberg"
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="client">
            Client / Auftraggeber
          </label>
          <input
            id="client"
            className="input"
            value={form.client}
            onChange={(e) => setForm((p) => ({ ...p, client: e.target.value }))}
            placeholder="z. B. Firma Müller"
          />
        </div>

        <div className="actions">
          <Link className="btn" href="/projects">
            Abbrechen
          </Link>

          <button
            className="btnPrimary"
            type="button"
            onClick={createProject}
            disabled={saving}
          >
            {saving ? 'Speichert…' : 'Projekt erstellen'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .page {
          max-width: 860px;
          margin: 0 auto;
          padding: 1rem;
          color: var(--text);
        }

        .topRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .backLink {
          color: var(--muted);
          text-decoration: none;
          font-weight: 950;
        }

        .backLink:hover {
          color: var(--text);
        }

        .hero {
          margin-top: 10px;
          margin-bottom: 18px;
        }

        .kicker {
          color: var(--muted);
          font-weight: 950;
          letter-spacing: 0.02em;
          margin-bottom: 6px;
        }

        .h1 {
          font-size: clamp(34px, 6vw, 52px);
          line-height: 1;
          font-weight: 950;
          margin: 0;
          color: var(--text);
        }

        .lead {
          margin: 12px 0 0;
          max-width: 720px;
          color: var(--muted);
          font-size: 18px;
          line-height: 1.5;
          font-weight: 800;
        }

        .error {
          margin: 0 0 14px;
          color: #ff6b6b;
          font-weight: 950;
        }

        .card {
          border: 1px solid var(--border);
          background: var(--chip);
          border-radius: 24px;
          padding: 18px;
          box-shadow: var(--shadow);
        }

        .field + .field {
          margin-top: 14px;
        }

        .label {
          display: block;
          margin-bottom: 8px;
          color: var(--muted);
          font-weight: 950;
          font-size: 14px;
        }

        .req {
          color: #ff8b8b;
        }

        .input {
          width: 100%;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.04);
          color: var(--text);
          border-radius: 16px;
          padding: 14px 14px;
          font-weight: 900;
          box-sizing: border-box;
          outline: none;
        }

        .input:focus {
          border-color: rgba(255, 255, 255, 0.28);
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.05);
        }

        .actions {
          margin-top: 18px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn,
        .btnPrimary {
          min-height: 46px;
          padding: 11px 16px;
          border-radius: 16px;
          font-weight: 950;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }

        .btn {
          border: 1px solid var(--border);
          background: var(--chip);
          color: var(--text);
        }

        .btnPrimary {
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.1);
          color: var(--text);
        }

        .btn:hover,
        .btnPrimary:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .btnPrimary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        @media (max-width: 720px) {
          .actions {
            flex-direction: column;
          }

          .btn,
          .btnPrimary {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
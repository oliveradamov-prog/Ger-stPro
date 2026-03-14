'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function NewProjectPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [client, setClient] = useState('')
  const [description, setDescription] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!name.trim()) throw new Error('Bitte Projektnamen eingeben.')

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw new Error(authError.message)
      if (!user) throw new Error('Nicht eingeloggt.')

      const { data: inserted, error: insertError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: name.trim(),
          location: location.trim() || null,
          client: client.trim() || null,
          description: description.trim() || null,
        })
        .select('id')
        .single()

      if (insertError) throw new Error(insertError.message)
      if (!inserted?.id) throw new Error('Projekt wurde erstellt, aber ohne ID zurückgegeben.')

      router.push(`/projects/${inserted.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err?.message ?? 'Projekt konnte nicht erstellt werden.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="topRow">
        <Link className="backLink" href="/projects">
          ← Zurück zu den Projekten
        </Link>

        <div className="btnRow">
          <button
            className="btnPrimary"
            type="submit"
            form="newProjectForm"
            disabled={loading}
          >
            {loading ? 'Wird erstellt…' : 'Projekt erstellen'}
          </button>
        </div>
      </div>

      <h1 className="h1" style={{ marginTop: 6 }}>
        Neues Projekt
      </h1>

      {error ? <div className="error">{error}</div> : null}

      <form
        id="newProjectForm"
        onSubmit={handleSubmit}
        className="grid"
        style={{ marginTop: 14 }}
      >
        <div className="card">
          <div className="label">Projektname</div>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Fassadengerüst Halle A"
          />
        </div>

        <div className="two">
          <div className="card">
            <div className="label">Standort / Baustelle</div>
            <input
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="z. B. Bad Dürrenberg"
            />
          </div>

          <div className="card">
            <div className="label">Client / Auftraggeber</div>
            <input
              className="input"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="z. B. Oliver / Firma XY"
            />
          </div>
        </div>

        <div className="card">
          <div className="label">Beschreibung</div>
          <textarea
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optionale Beschreibung…"
          />
        </div>
      </form>

      <style jsx>{`
        .page {
          max-width: 980px;
          margin: 0 auto;
          padding: 1rem;
          color: var(--text);
          overflow-x: hidden;
        }

        .h1 {
          font-size: 44px;
          font-weight: 950;
          margin: 0;
          color: var(--text);
          word-break: break-word;
        }

        .label {
          color: var(--muted);
          font-weight: 950;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .error {
          margin-top: 12px;
          color: #ff6b6b;
          font-weight: 950;
        }

        .topRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .backLink {
          color: var(--muted);
          text-decoration: none;
          font-weight: 950;
        }

        .backLink:hover {
          color: var(--text);
        }

        .btnRow {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          max-width: 100%;
        }

        .btnPrimary {
          min-height: 44px;
          padding: 10px 14px;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 950;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
          max-width: 100%;
          white-space: nowrap;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.1);
          color: var(--text);
        }

        .btnPrimary:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.22);
        }

        .btnPrimary:active {
          transform: translateY(0px) scale(0.995);
        }

        .btnPrimary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .grid {
          display: grid;
          gap: 14px;
        }

        .two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .card {
          border: 1px solid var(--border);
          background: var(--chip);
          border-radius: 18px;
          padding: 16px;
          overflow: hidden;
        }

        .input,
        .textarea {
          width: 100%;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.04);
          color: var(--text);
          border-radius: 14px;
          padding: 12px;
          font-weight: 900;
          box-sizing: border-box;
        }

        .textarea {
          min-height: 130px;
          resize: vertical;
          white-space: pre-wrap;
        }

        @media (max-width: 720px) {
          .two {
            grid-template-columns: 1fr;
          }

          .btnPrimary {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
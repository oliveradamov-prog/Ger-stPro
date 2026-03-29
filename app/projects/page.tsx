'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import RequireAuth from '@/components/RequireAuth'

type Project = {
  id: string
  name: string
  location: string | null
  client: string | null
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProjects() {
      setMsg('')
      setLoading(true)

      try {
        useEffect(() => {
          let cancelled = false

          async function loadProjects() {
            setMsg('')
            setLoading(true)

            try {
              const {
                data: { user },
                error: userError,
              } = await supabase.auth.getUser()

              if (userError) throw userError

              if (!user) {
                if (!cancelled) {
                  setProjects([])
                  setLoading(false)
                }
                return
              }

              const { data, error } = await supabase
                .from('projects')
                .select('id, name, location, client')
                .order('created_at', { ascending: false })

              if (error) throw error

              if (!cancelled) {
                setProjects((data as Project[]) ?? [])
              }
            } catch (e: any) {
              if (!cancelled) {
                setMsg(e?.message ?? 'Projekte konnten nicht geladen werden.')
              }
            } finally {
              if (!cancelled) {
                setLoading(false)
              }
            }
          }

          loadProjects()

          return () => {
            cancelled = true
          }
        }, [])

        const { data, error } = await supabase
          .from('projects')
          .select('id, name, location, client')
          .order('created_at', { ascending: false })

        if (error) throw error

        if (!cancelled) {
          setProjects((data as Project[]) ?? [])
        }
      } catch (e: any) {
        if (!cancelled) {
          setMsg(e?.message ?? 'Projekte konnten nicht geladen werden.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProjects()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <RequireAuth>
      <div className="page">
        <div className="topRow">
          <div>
            <div className="kicker">GerüstPro</div>
            <h1 className="h1">Projekte</h1>
          </div>

          <Link className="btnPrimary" href="/projects/new">
            Neues Projekt
          </Link>
        </div>

        {msg ? <div className="error">{msg}</div> : null}

        {loading ? (
          <p className="muted" style={{ marginTop: 16 }}>
            Wird geladen…
          </p>
        ) : projects.length === 0 ? (
          <div className="card" style={{ marginTop: 14 }}>
            <div className="cardTitle">Keine Projekte</div>
            <div className="cardValue">
              Erstelle dein erstes Projekt, um zu starten.
            </div>
          </div>
        ) : (
          <div className="grid" style={{ marginTop: 14 }}>
            {projects.map((project) => (
              <div key={project.id} className="card">
                <div className="cardHeader">
                  <div className="projectName">{project.name}</div>

                  <Link className="btn" href={`/projects/${project.id}`}>
                    Tagesberichte öffnen →
                  </Link>
                </div>

                <div className="meta">
                  <span>
                    <span className="muted">Standort:</span> {project.location || '—'}
                  </span>
                  <span className="dot">•</span>
                  <span>
                    <span className="muted">Client:</span> {project.client || '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <style jsx>{`
          .page {
            max-width: 980px;
            margin: 0 auto;
            padding: 1rem;
            color: var(--text);
            overflow-x: hidden;
          }

          .kicker {
            color: var(--muted);
            font-weight: 900;
            letter-spacing: 0.02em;
          }

          .h1 {
            font-size: 44px;
            font-weight: 950;
            margin: 6px 0 0;
            color: var(--text);
            word-break: break-word;
          }

          .muted {
            color: var(--muted);
            font-weight: 800;
          }

          .error {
            margin-top: 12px;
            color: #ff6b6b;
            font-weight: 950;
          }

          .topRow {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 12px;
            flex-wrap: wrap;
          }

          .btn,
          .btnPrimary {
            min-height: 44px;
            padding: 10px 14px;
            border-radius: 14px;
            cursor: pointer;
            font-weight: 950;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
            white-space: nowrap;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
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
            box-shadow: 0 12px 34px rgba(0, 0, 0, 0.22);
          }

          .grid {
            display: grid;
            gap: 14px;
          }

          .card {
            border: 1px solid var(--border);
            background: var(--chip);
            border-radius: 18px;
            padding: 16px;
          }

          .cardTitle {
            color: var(--muted);
            font-weight: 950;
            font-size: 14px;
            margin-bottom: 8px;
          }

          .cardValue {
            font-weight: 900;
            color: var(--text);
          }

          .cardHeader {
            display: flex;
            gap: 12px;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
          }

          .projectName {
            font-size: 28px;
            font-weight: 950;
            color: var(--text);
            word-break: break-word;
          }

          .meta {
            margin-top: 10px;
            color: var(--muted);
            font-weight: 900;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }

          .dot {
            opacity: 0.6;
          }

          @media (max-width: 720px) {
            .btn,
            .btnPrimary {
              width: 100%;
            }

            .cardHeader {
              align-items: stretch;
            }
          }
        `}</style>
      </div>
    </RequireAuth>
  )
}
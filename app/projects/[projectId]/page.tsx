'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import RequireAuth from '@/components/RequireAuth'

type Project = {
  id: string
  name: string
  location: string | null
  client: string | null
}

type DailyLog = {
  id: string
  project_id: string
  user_id: string
  log_date: string
  description: string | null
  work_description: string | null
  created_at: string
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

function shortText(s: string | null, n = 90) {
  const t = (s ?? '').trim()
  if (!t) return '(leer)'
  if (t.length <= n) return t
  return t.slice(0, n).trimEnd() + '…'
}

export default function ProjectDetailsPage() {
  const params = useParams()

  const projectId = useMemo(() => {
    const raw = (params as any)?.projectId
    return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
  }, [params])

  const [project, setProject] = useState<Project | null>(null)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setMsg('')
      setLoading(true)

      if (!projectId) {
        setLoading(false)
        return
      }

      try {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name, location, client')
          .eq('id', projectId)
          .single()

        if (projectError) throw projectError

        const { data: logsData, error: logsError } = await supabase
          .from('daily_logs')
          .select('id, project_id, user_id, log_date, description, work_description, created_at')
          .eq('project_id', projectId)
          .order('log_date', { ascending: false })
          .order('created_at', { ascending: false })

        if (logsError) throw logsError

        if (!cancelled) {
          setProject(projectData as Project)
          setLogs((logsData as DailyLog[]) ?? [])
        }
      } catch (e: any) {
        if (!cancelled) setMsg(e?.message ?? 'Etwas ist schiefgelaufen.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [projectId])

  return (
    <RequireAuth>
      {!projectId ? (
        <div className="page">
          <h1 className="h1">Projekt</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Projekt-ID fehlt in der URL.
          </p>
          <style jsx>{styles}</style>
        </div>
      ) : (
        <div className="page">
          <div className="topRow">
            <div>
              <div className="kicker">GerüstPro</div>
              <h1 className="h1">{project?.name ?? 'Projekt'}</h1>

              <div className="metaBlock">
                <div className="metaLine">
                  <span className="metaLabel">Standort / Baustelle:</span>{' '}
                  <span>{project?.location || '—'}</span>
                </div>
                <div className="metaLine">
                  <span className="metaLabel">Client / Auftraggeber:</span>{' '}
                  <span>{project?.client || '—'}</span>
                </div>
              </div>
            </div>

            <div className="btnRow">
              <Link className="btn" href="/projects">
                Alle Projekte
              </Link>
              <Link className="btnPrimary" href={`/projects/${projectId}/new-log`}>
                Neuer Tagesbericht
              </Link>
            </div>
          </div>

          {msg ? <div className="error">{msg}</div> : null}

          {loading ? (
            <p className="muted" style={{ marginTop: 16 }}>
              Wird geladen…
            </p>
          ) : (
            <div style={{ marginTop: 18 }}>
              <h2 className="h2">Tagesberichte</h2>

              {logs.length === 0 ? (
                <div className="empty">
                  <p style={{ margin: 0 }}>Noch keine Tagesberichte vorhanden.</p>
                  <p style={{ marginTop: 8 }}>
                    Klicke auf <b>Neuer Tagesbericht</b>, um den ersten Eintrag zu erstellen.
                  </p>
                </div>
              ) : (
                <div className="grid">
                  {logs.map((log) => (
                    <Link
                      key={log.id}
                      href={`/projects/${projectId}/logs/${log.id}`}
                      className="logCard"
                    >
                      <div className="date">{formatDate(log.log_date)}</div>
                      <div className="title">{shortText(log.description, 90)}</div>
                      <div className="desc">{shortText(log.work_description, 130)}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <style jsx>{styles}</style>
        </div>
      )}
    </RequireAuth>
  )
}

const styles = `
  .page{
    max-width: 980px;
    margin: 0 auto;
    padding: 1rem;
    color: var(--text);
    overflow-x: hidden;
  }

  .topRow{
    display:flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    flex-wrap: wrap;
  }

  .btnRow{
    display:flex;
    gap:10px;
    flex-wrap:wrap;
    max-width:100%;
  }

  .kicker{
    color: var(--muted);
    font-weight: 900;
    letter-spacing: .02em;
  }

  .h1{
    font-size: 44px;
    font-weight: 950;
    margin: 6px 0 0;
    color: var(--text);
    letter-spacing: -0.03em;
    word-break: break-word;
  }

  .h2{
    margin: 0 0 12px 0;
    font-size: 30px;
    font-weight: 950;
    color: var(--text);
  }

  .muted{
    color: var(--muted);
    font-weight: 800;
  }

  .error{
    margin-top: 12px;
    color: #ff6b6b;
    font-weight: 950;
  }

  .metaBlock{
    margin-top: 14px;
    display:grid;
    gap:8px;
  }

  .metaLine{
    color: var(--text);
    font-weight: 800;
    line-height: 1.4;
  }

  .metaLabel{
    color: var(--muted);
    font-weight: 900;
  }

  .btn,
  .btnPrimary{
    min-height:44px;
    padding:10px 14px;
    border-radius:14px;
    cursor:pointer;
    font-weight:950;
    transition:transform .15s ease, box-shadow .15s ease;
    white-space:nowrap;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    text-decoration:none;
  }

  .btn{
    border:1px solid var(--border);
    background:var(--chip);
    color:var(--text);
  }

  .btnPrimary{
    border:1px solid rgba(255,255,255,.22);
    background:rgba(255,255,255,.10);
    color:var(--text);
  }

  .btn:hover,
  .btnPrimary:hover{
    transform:translateY(-1px);
    box-shadow:0 12px 34px rgba(0,0,0,.22);
  }

  .empty{
    border: 1px solid var(--border);
    background: var(--chip);
    border-radius: 18px;
    padding: 14px;
    color: var(--text);
  }

  .grid{
    display: grid;
    gap: 14px;
  }

  .logCard{
    display: block;
    text-decoration: none;
    border: 1px solid var(--border);
    background: var(--chip);
    border-radius: 18px;
    padding: 16px;
    color: var(--text);
    transition: transform .15s ease, box-shadow .15s ease;
  }

  .logCard:hover{
    transform: translateY(-1px);
    box-shadow: 0 12px 34px rgba(0,0,0,.22);
  }

  .date{
    color: var(--muted);
    font-weight: 800;
    font-size: 14px;
  }

  .title{
    margin-top: 8px;
    font-size: 28px;
    font-weight: 950;
    color: var(--text);
    line-height: 1.15;
    word-break: break-word;
  }

  .desc{
    margin-top: 8px;
    color: var(--muted);
    font-weight: 800;
    line-height: 1.4;
    word-break: break-word;
  }

  @media(max-width:720px){
    .btn,
    .btnPrimary{
      width:100%;
    }
  }

  @media print{
    .btnRow{ display:none !important; }
  }
`
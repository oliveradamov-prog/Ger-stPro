'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

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
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
}

function shortText(s: string | null, n = 70) {
  const t = (s ?? '').trim()
  if (!t) return '(empty)'
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
        if (!cancelled) setMsg(e?.message ?? 'Something went wrong')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (!projectId) {
    return (
      <div className="page">
        <h1 className="h1">Project</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Missing projectId in the URL.
        </p>
        <style jsx>{styles}</style>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="topRow">
        <div>
          <h1 className="h1">{project?.name ?? 'Project'}</h1>

          {project?.location ? (
            <p className="muted" style={{ marginTop: 10 }}>
              Location: {project.location}
            </p>
          ) : null}

          {project?.client ? (
            <p className="muted" style={{ marginTop: 6 }}>
              Client: {project.client}
            </p>
          ) : null}
        </div>

        <Link className="newBtn" href={`/projects/${projectId}/new-log`}>
          New Daily Log
        </Link>
      </div>

      {msg ? <div className="error">{msg}</div> : null}

      {loading ? (
        <p className="muted" style={{ marginTop: 16 }}>
          Loading…
        </p>
      ) : (
        <div style={{ marginTop: 18 }}>
          <h2 className="h2">Daily Logs</h2>

          {logs.length === 0 ? (
            <div className="empty">
              <p style={{ margin: 0 }}>No daily logs yet.</p>
              <p style={{ marginTop: 8 }}>
                Click <b>New Daily Log</b> to create one.
              </p>
            </div>
          ) : (
            <div className="grid">
              {logs.map((log) => (
                <Link key={log.id} href={`/projects/${projectId}/logs/${log.id}`} className="logCard">
                  <div className="date">{formatDate(log.log_date)}</div>
                  <div className="title">{shortText(log.description, 90)}</div>
                  <div className="desc">{shortText(log.work_description, 110)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{styles}</style>
    </div>
  )
}

const styles = `
  .page{
    max-width: 980px;
    margin: 0 auto;
    padding: 1rem;
    color: var(--text);
  }

  .topRow{
    display:flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    flex-wrap: wrap;
  }

  .h1{
    font-size: 54px;
    font-weight: 950;
    margin: 0;
    color: var(--text);
    letter-spacing: -0.4px;
  }

  .h2{
    margin: 0 0 12px 0;
    font-size: 34px;
    font-weight: 950;
    color: var(--text);
  }

  .muted{
    color: var(--muted);
    font-weight: 700;
  }

  .error{
    margin-top: 12px;
    color: #ff6b6b;
    font-weight: 800;
  }

  .newBtn{
    align-self: flex-start;
    text-decoration: none;
    color: var(--text);
    border: 1px solid var(--border);
    background: var(--chip);
    padding: 12px 16px;
    border-radius: 18px;
    font-weight: 950;
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
  }

  /* ✅ EZ A JAVÍTÁS: nem halvány többé sem dark, sem light módban */
  .desc{
    margin-top: 8px;
    color: var(--muted);
    font-weight: 700;
    line-height: 1.35;
  }

  @media print{
    .newBtn{ display:none !important; }
  }
`
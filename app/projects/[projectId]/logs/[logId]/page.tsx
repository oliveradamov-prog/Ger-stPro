'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const COL_WORKERS_COUNT = 'workers_count'
const COL_SITE_MANAGERS_COUNT = 'site_managers_count'
const COL_WORKERS_NAMES = 'workers_names'
const COL_SITE_MANAGERS_NAMES = 'site_managers_names'

const PHOTOS_BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET || 'DAILY-LOG-PHOTOS'
const PHOTOS_TABLE = 'daily_log_photos'

type DailyLog = {
  id: string
  project_id: string
  user_id: string
  log_date: string
  description: string | null
  work_description: string | null
  created_at: string
  [COL_WORKERS_COUNT]?: number | null
  [COL_SITE_MANAGERS_COUNT]?: number | null
  [COL_WORKERS_NAMES]?: string | string[] | null
  [COL_SITE_MANAGERS_NAMES]?: string | string[] | null
}

type Project = { id: string; name: string; location: string | null; client: string | null }
type PhotoRow = { log_id: string; path: string; created_at?: string }

function formatDateLong(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: '2-digit' })
}
function asText(v: any) {
  if (v == null) return ''
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

export default function LogDetailsPage() {
  const params = useParams()
  const router = useRouter()

  const projectId = useMemo(() => {
    const raw = (params as any)?.projectId
    return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
  }, [params])

  const logId = useMemo(() => {
    const raw = (params as any)?.logId
    return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
  }, [params])

  const [project, setProject] = useState<Project | null>(null)
  const [log, setLog] = useState<DailyLog | null>(null)
  const [photos, setPhotos] = useState<PhotoRow[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setMsg('')
      setLoading(true)
      if (!projectId || !logId) return setLoading(false)

      try {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name, location, client')
          .eq('id', projectId)
          .single()
        if (projectError) throw projectError

        const { data: logData, error: logError } = await supabase
          .from('daily_logs')
          .select(
            [
              'id, project_id, user_id, log_date, description, work_description, created_at',
              COL_WORKERS_COUNT,
              COL_SITE_MANAGERS_COUNT,
              COL_WORKERS_NAMES,
              COL_SITE_MANAGERS_NAMES,
            ].join(', ')
          )
          .eq('id', logId)
          .eq('project_id', projectId)
          .single()
        if (logError) throw logError

        const { data: photoRows, error: photoError } = await supabase
          .from(PHOTOS_TABLE)
          .select('log_id, path, created_at')
          .eq('log_id', logId)
          .order('created_at', { ascending: false })

        if (photoError) console.warn(photoError.message)

        if (!cancelled) {
          setProject(projectData as Project)
          setLog(logData as DailyLog)
          setPhotos((photoRows as PhotoRow[]) ?? [])
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
  }, [projectId, logId])

  // ✅ SIGNED URL (private bucket esetén is működik)
  useEffect(() => {
    let cancelled = false
    async function buildSignedUrls() {
      const map: Record<string, string> = {}
      for (const p of photos) {
        const { data, error } = await supabase.storage.from(PHOTOS_BUCKET).createSignedUrl(p.path, 60 * 60)
        if (!error && data?.signedUrl) map[p.path] = data.signedUrl
      }
      if (!cancelled) setPhotoUrls(map)
    }
    buildSignedUrls()
    return () => {
      cancelled = true
    }
  }, [photos])

  function exportPdf() {
    window.print()
  }

  if (!projectId || !logId) {
    return (
      <div className="page">
        <h1 className="h1">Daily Log</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Missing projectId/logId in the URL.
        </p>
        <style jsx>{baseStyles}</style>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="topRow">
        <Link className="backLink" href={`/projects/${projectId}`}>
          ← Back to Project
        </Link>

        <div className="btnRow">
          <button className="btn" onClick={exportPdf} type="button">
            Export PDF
          </button>
          <button className="btn" onClick={() => window.print()} type="button">
            Print
          </button>
          <button className="btnPrimary" onClick={() => router.push(`/projects/${projectId}/logs/${logId}/edit`)} type="button">
            Edit
          </button>
        </div>
      </div>

      {msg ? <div className="error">{msg}</div> : null}

      {loading ? (
        <p className="muted" style={{ marginTop: 16 }}>
          Loading…
        </p>
      ) : log ? (
        <>
          <h1 className="h1" style={{ marginTop: 6 }}>
            {log.description?.trim() ? log.description : 'Daily Log'}
          </h1>

          <div className="meta">
            <span>{formatDateLong(log.log_date)}</span>
            <span className="dot">•</span>
            <span className="strong">{project?.name ?? 'Project'}</span>
          </div>

          <div className="divider" />

          <div className="grid">
            <div className="card">
              <div className="cardTitle">Work description</div>
              <div className="cardValue">{log.work_description?.trim() ? log.work_description : '(empty)'}</div>
            </div>

            <div className="card">
              <div className="cardTitle">Crew</div>
              <div className="crewGrid">
                <div className="crewItem">
                  <div className="crewLabel">Workers count</div>
                  <div className="crewValue">{(log as any)?.[COL_WORKERS_COUNT] ?? 0}</div>
                </div>
                <div className="crewItem">
                  <div className="crewLabel">Site managers count</div>
                  <div className="crewValue">{(log as any)?.[COL_SITE_MANAGERS_COUNT] ?? 0}</div>
                </div>
                <div className="crewItem">
                  <div className="crewLabel">Workers names</div>
                  <div className="crewText">{asText((log as any)?.[COL_WORKERS_NAMES]) || '—'}</div>
                </div>
                <div className="crewItem">
                  <div className="crewLabel">Site managers names</div>
                  <div className="crewText">{asText((log as any)?.[COL_SITE_MANAGERS_NAMES]) || '—'}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="cardTitle">Photos</div>

              {photos.length === 0 ? (
                <div className="muted" style={{ fontWeight: 900 }}>
                  No photos for this log.
                </div>
              ) : (
                <div className="photos">
                  {photos.map((p) => {
                    const url = photoUrls[p.path]
                    return (
                      <a key={p.path} className="photo" href={url || '#'} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="Log photo" />
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="cardTitle">Not found</div>
          <div className="cardValue">This log doesn’t exist or you don’t have access.</div>
        </div>
      )}

      <style jsx>{baseStyles}</style>

      <style jsx>{`
        .topRow{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;}
        .backLink{color:var(--muted);text-decoration:none;font-weight:900;}
        .backLink:hover{color:var(--text);}
        .btnRow{display:flex;gap:10px;flex-wrap:wrap;max-width:100%;}
        .btn,.btnPrimary{min-height:44px;padding:10px 14px;border-radius:14px;cursor:pointer;font-weight:950;transition:.15s;max-width:100%;}
        .btn{border:1px solid var(--border);background:var(--chip);color:var(--text);}
        .btnPrimary{border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.10);color:var(--text);}
        .meta{margin-top:10px;color:var(--muted);font-weight:900;display:flex;gap:10px;flex-wrap:wrap;}
        .dot{opacity:.6;}
        .strong{color:var(--text);opacity:.95;}
        .divider{margin:18px 0;height:1px;background:var(--border);opacity:.7;}
        .grid{display:grid;gap:14px;}
        .card{border:1px solid var(--border);background:var(--chip);border-radius:18px;padding:16px;color:var(--text);}
        .cardTitle{color:var(--muted);font-weight:950;font-size:14px;margin-bottom:8px;}
        .cardValue{font-size:20px;font-weight:950;white-space:pre-wrap;}
        .crewGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        @media(max-width:720px){.crewGrid{grid-template-columns:1fr;}.btn,.btnPrimary{flex:1;}}
        .crewItem{border:1px solid var(--border);background:rgba(255,255,255,.03);border-radius:14px;padding:12px;}
        .crewLabel{color:var(--muted);font-weight:950;font-size:13px;margin-bottom:6px;}
        .crewValue{font-weight:950;font-size:22px;}
        .crewText{font-weight:900;font-size:16px;white-space:pre-wrap;}
        .photos{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr));}
        @media(max-width:720px){.photos{grid-template-columns:1fr;}}
        .photo{display:block;border:1px solid var(--border);border-radius:16px;overflow:hidden;background:rgba(255,255,255,.03);}
        .photo img{width:100%;height:200px;object-fit:cover;display:block;}
      `}</style>

      <style jsx>{`
        @media print{
          .topRow,.btnRow,.backLink{display:none!important;}
          .page{padding:0!important;}
        }
      `}</style>
    </div>
  )
}

const baseStyles = `
  .page{max-width:980px;margin:0 auto;padding:1rem;color:var(--text);overflow-x:hidden;}
  .h1{font-size:44px;font-weight:950;margin:0;color:var(--text);word-break:break-word;}
  .muted{color:var(--muted);font-weight:800;}
  .error{margin-top:12px;color:#ff6b6b;font-weight:950;}
`
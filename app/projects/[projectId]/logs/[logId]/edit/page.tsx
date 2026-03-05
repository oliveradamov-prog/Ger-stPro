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
  log_date: string
  description: string | null
  work_description: string | null
  [COL_WORKERS_COUNT]?: number | null
  [COL_SITE_MANAGERS_COUNT]?: number | null
  [COL_WORKERS_NAMES]?: string | string[] | null
  [COL_SITE_MANAGERS_NAMES]?: string | string[] | null
}
type PhotoRow = { log_id: string; path: string; created_at?: string }

function asString(v: any) {
  if (v == null) return ''
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

export default function LogEditPage() {
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

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [form, setForm] = useState({
    log_date: '',
    description: '',
    work_description: '',
    workers_count: 0,
    site_managers_count: 0,
    workers_names: '',
    site_managers_names: '',
  })

  const [photos, setPhotos] = useState<PhotoRow[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      setMsg('')
      setLoading(true)
      try {
        if (!projectId || !logId) return

        const { data: logData, error } = await supabase
          .from('daily_logs')
          .select(
            [
              'id, project_id, log_date, description, work_description',
              COL_WORKERS_COUNT,
              COL_SITE_MANAGERS_COUNT,
              COL_WORKERS_NAMES,
              COL_SITE_MANAGERS_NAMES,
            ].join(', ')
          )
          .eq('id', logId)
          .eq('project_id', projectId)
          .single()
        if (error) throw error
        const log = logData as DailyLog

        const { data: photoRows } = await supabase
          .from(PHOTOS_TABLE)
          .select('log_id, path, created_at')
          .eq('log_id', logId)
          .order('created_at', { ascending: false })

        if (!cancelled) {
          setForm({
            log_date: log.log_date || '',
            description: log.description ?? '',
            work_description: log.work_description ?? '',
            workers_count: Number((log as any)?.[COL_WORKERS_COUNT] ?? 0),
            site_managers_count: Number((log as any)?.[COL_SITE_MANAGERS_COUNT] ?? 0),
            workers_names: asString((log as any)?.[COL_WORKERS_NAMES]),
            site_managers_names: asString((log as any)?.[COL_SITE_MANAGERS_NAMES]),
          })
          setPhotos((photoRows as PhotoRow[]) ?? [])
        }
      } catch (e: any) {
        if (!cancelled) setMsg(e?.message ?? 'Load failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [projectId, logId])

  // ✅ signed urls
  useEffect(() => {
    let cancelled = false
    async function build() {
      const map: Record<string, string> = {}
      for (const p of photos) {
        const { data, error } = await supabase.storage.from(PHOTOS_BUCKET).createSignedUrl(p.path, 60 * 60)
        if (!error && data?.signedUrl) map[p.path] = data.signedUrl
      }
      if (!cancelled) setPhotoUrls(map)
    }
    build()
    return () => {
      cancelled = true
    }
  }, [photos])

  async function save() {
    setMsg('')
    setSaving(true)
    try {
      const payload: any = {
        log_date: form.log_date,
        description: form.description?.trim() || null,
        work_description: form.work_description?.trim() || null,
        [COL_WORKERS_COUNT]: Number(form.workers_count || 0),
        [COL_SITE_MANAGERS_COUNT]: Number(form.site_managers_count || 0),
        [COL_WORKERS_NAMES]: form.workers_names?.trim() || null,
        [COL_SITE_MANAGERS_NAMES]: form.site_managers_names?.trim() || null,
      }

      const { error } = await supabase
        .from('daily_logs')
        .update(payload)
        .eq('id', logId)
        .eq('project_id', projectId)

      if (error) throw error

      router.push(`/projects/${projectId}/logs/${logId}`)
    } catch (e: any) {
      setMsg(e?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files || files.length === 0) return
    setMsg('')
    try {
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth?.user?.id || 'anon'

      const inserted: PhotoRow[] = []
      for (const file of Array.from(files)) {
        const safe = file.name.replace(/[^\w.\-]+/g, '_')
        const path = `${userId}/${logId}/${Date.now()}_${safe}`

        const up = await supabase.storage.from(PHOTOS_BUCKET).upload(path, file, { upsert: false })
        if (up.error) throw up.error

        const ins = await supabase.from(PHOTOS_TABLE).insert({ log_id: logId, path }).select()
        if (ins.error) throw ins.error

        inserted.push({ log_id: logId, path })
      }

      setPhotos((prev) => [...inserted, ...prev])
    } catch (e: any) {
      setMsg(e?.message ?? 'Upload failed')
    }
  }

  if (!projectId || !logId) {
    return (
      <div className="page">
        <h1 className="h1">Edit Log</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Missing projectId/logId.
        </p>
        <style jsx>{baseStyles}</style>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="topRow">
        <Link className="backLink" href={`/projects/${projectId}/logs/${logId}`}>
          ← Back
        </Link>

        <div className="btnRow">
          <button className="btn" onClick={() => router.push(`/projects/${projectId}/logs/${logId}`)} type="button">
            Cancel
          </button>
          <button className="btnPrimary" onClick={save} type="button" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {msg ? <div className="error">{msg}</div> : null}

      {loading ? (
        <p className="muted" style={{ marginTop: 16 }}>
          Loading…
        </p>
      ) : (
        <div className="grid" style={{ marginTop: 14 }}>
          <div className="card">
            <div className="label">Date</div>
            <input className="input" type="date" value={form.log_date} onChange={(e) => setForm((p) => ({ ...p, log_date: e.target.value }))} />
          </div>

          <div className="card">
            <div className="label">Title</div>
            <input className="input" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>

          <div className="two">
            <div className="card">
              <div className="label">Workers count</div>
              <input className="input" type="number" value={form.workers_count} onChange={(e) => setForm((p) => ({ ...p, workers_count: Number(e.target.value || 0) }))} />
            </div>
            <div className="card">
              <div className="label">Site managers count</div>
              <input className="input" type="number" value={form.site_managers_count} onChange={(e) => setForm((p) => ({ ...p, site_managers_count: Number(e.target.value || 0) }))} />
            </div>
          </div>

          <div className="two">
            <div className="card">
              <div className="label">Workers names</div>
              <textarea className="textarea" value={form.workers_names} onChange={(e) => setForm((p) => ({ ...p, workers_names: e.target.value }))} />
            </div>
            <div className="card">
              <div className="label">Site managers names</div>
              <textarea className="textarea" value={form.site_managers_names} onChange={(e) => setForm((p) => ({ ...p, site_managers_names: e.target.value }))} />
            </div>
          </div>

          <div className="card">
            <div className="label">Work description</div>
            <textarea className="textarea" value={form.work_description} onChange={(e) => setForm((p) => ({ ...p, work_description: e.target.value }))} />
          </div>

          <div className="card">
            <div className="label">Photos</div>
            <input className="file" type="file" accept="image/*" multiple onChange={(e) => uploadPhotos(e.target.files)} />

            {photos.length === 0 ? (
              <div className="muted" style={{ marginTop: 10, fontWeight: 900 }}>
                No photos yet.
              </div>
            ) : (
              <div className="photos" style={{ marginTop: 12 }}>
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
      )}

      <style jsx>{baseStyles}</style>

      <style jsx>{`
        .topRow{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;}
        .backLink{color:var(--muted);text-decoration:none;font-weight:950;}
        .btnRow{display:flex;gap:10px;flex-wrap:wrap;max-width:100%;}
        .btn,.btnPrimary{min-height:44px;padding:10px 14px;border-radius:14px;cursor:pointer;font-weight:950;max-width:100%;}
        .btn{border:1px solid var(--border);background:var(--chip);color:var(--text);}
        .btnPrimary{border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.10);color:var(--text);}
        .btnPrimary:disabled{opacity:.6;cursor:not-allowed;}
        .grid{display:grid;gap:14px;}
        .two{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
        @media(max-width:720px){.two{grid-template-columns:1fr;}.btn,.btnPrimary{flex:1;}}
        .card{border:1px solid var(--border);background:var(--chip);border-radius:18px;padding:16px;overflow:hidden;}
        .label{color:var(--muted);font-weight:950;font-size:14px;margin-bottom:8px;}
        .input,.textarea{width:100%;border:1px solid var(--border);background:rgba(255,255,255,.04);color:var(--text);border-radius:14px;padding:12px;font-weight:900;box-sizing:border-box;}
        .textarea{min-height:110px;resize:vertical;white-space:pre-wrap;}
        .file{width:100%;max-width:100%;}
        .photos{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr));}
        @media(max-width:720px){.photos{grid-template-columns:1fr;}}
        .photo{display:block;border:1px solid var(--border);border-radius:16px;overflow:hidden;background:rgba(255,255,255,.03);}
        .photo img{width:100%;height:200px;object-fit:cover;display:block;}
      `}</style>
    </div>
  )
}

const baseStyles = `
  .page{max-width:980px;margin:0 auto;padding:1rem;color:var(--text);overflow-x:hidden;}
  .h1{font-size:44px;font-weight:950;margin:0;color:var(--text);}
  .muted{color:var(--muted);font-weight:800;}
  .error{margin-top:12px;color:#ff6b6b;font-weight:950;}
`
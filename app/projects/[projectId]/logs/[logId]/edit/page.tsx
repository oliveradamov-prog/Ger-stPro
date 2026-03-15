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

type PhotoRow = {
  id?: string
  user_id?: string
  project_id?: string
  log_id: string
  path: string
  created_at?: string
}

type DailyLog = {
  id: string
  project_id: string
  user_id?: string
  log_date: string
  description: string | null
  work_description: string | null
  [COL_WORKERS_COUNT]?: number | null
  [COL_SITE_MANAGERS_COUNT]?: number | null
  [COL_WORKERS_NAMES]?: string | string[] | null
  [COL_SITE_MANAGERS_NAMES]?: string | string[] | null
}

function asString(v: any) {
  if (v == null) return ''
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

function toTextArray(v: any): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean)

  const s = String(v ?? '').trim()
  if (!s) return []

  const parts = s
    .split(/[,;\n]+/g)
    .map((x) => x.trim())
    .filter(Boolean)

  const seen = new Set<string>()
  const out: string[] = []

  for (const p of parts) {
    const key = p.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }

  return out
}

function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, '_')
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('de-DE')
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
    workers_names: '',
    site_managers_names: '',
  })

  const [photos, setPhotos] = useState<PhotoRow[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [photosUploading, setPhotosUploading] = useState(false)

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
              'id, project_id, user_id, log_date, description, work_description',
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

        const log = (Array.isArray(logData) ? logData[0] : logData) as DailyLog | null

        if (!log) {
          throw new Error('Log nicht gefunden')
        }
        const { data: photoRows, error: photoErr } = await supabase
          .from(PHOTOS_TABLE)
          .select('id, user_id, project_id, log_id, path, created_at')
          .eq('project_id', projectId)
          .eq('log_id', logId)
          .order('created_at', { ascending: false })

        if (photoErr) console.warn(photoErr.message)

        if (!cancelled) {
          setForm({
            log_date: log.log_date || '',
            description: log.description ?? '',
            work_description: log.work_description ?? '',
            workers_names: asString((log as any)?.[COL_WORKERS_NAMES]),
            site_managers_names: asString((log as any)?.[COL_SITE_MANAGERS_NAMES]),
          })
          setPhotos((photoRows as PhotoRow[]) ?? [])
        }
      } catch (e: any) {
        if (!cancelled) setMsg(e?.message ?? 'Laden fehlgeschlagen')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [projectId, logId])

  useEffect(() => {
    let cancelled = false

    async function build() {
      if (!photos.length) {
        setPhotoUrls({})
        return
      }

      try {
        const entries = await Promise.all(
          photos.map(async (p) => {
            const { data, error } = await supabase.storage
              .from(PHOTOS_BUCKET)
              .createSignedUrl(p.path, 60 * 60)

            if (error || !data?.signedUrl) return [p.path, ''] as const
            return [p.path, data.signedUrl] as const
          })
        )

        if (!cancelled) setPhotoUrls(Object.fromEntries(entries.filter(([, u]) => !!u)))
      } catch {
        if (!cancelled) setPhotoUrls({})
      }
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
      if (!projectId || !logId) throw new Error('projectId/logId fehlt')
      if (!form.log_date) throw new Error('Bitte Datum auswählen.')

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Nicht eingeloggt.')

      const workersArr = toTextArray(form.workers_names)
      const managersArr = toTextArray(form.site_managers_names)

      const payload: any = {
        log_date: form.log_date,
        description: form.description?.trim() || null,
        work_description: form.work_description?.trim() || null,
        [COL_WORKERS_NAMES]: workersArr,
        [COL_SITE_MANAGERS_NAMES]: managersArr,
        [COL_WORKERS_COUNT]: workersArr.length,
        [COL_SITE_MANAGERS_COUNT]: managersArr.length,
      }

      const { data, error } = await supabase
        .from('daily_logs')
        .update(payload)
        .eq('id', logId)
        .select('id, workers_names, site_managers_names')

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error('Es wurde kein Datensatz aktualisiert.')
      }
      
      setMsg('')
      router.push(`/projects/${projectId}/logs/${logId}`)
      router.refresh()
    } catch (e: any) {
      setMsg(e?.message ?? 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }
  async function compressImage(file: File, maxBytes = 1024 * 1024): Promise<File> {
    if (!file.type.startsWith('image/')) return file

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = dataUrl
    })

    let width = img.naturalWidth
    let height = img.naturalHeight

    const maxDimension = 1800
    if (width > maxDimension || height > maxDimension) {
      const scale = Math.min(maxDimension / width, maxDimension / height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    ctx.drawImage(img, 0, 0, width, height)

    let quality = 0.9
    let blob: Blob | null = null

    while (quality >= 0.5) {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality)
      )

      if (blob && blob.size <= maxBytes) break
      quality -= 0.1
    }

    if (!blob) return file

    return new File(
      [blob],
      file.name.replace(/\.[^.]+$/, '') + '.jpg',
      { type: 'image/jpeg' }
    )
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files || files.length === 0) return
    setMsg('')
    setPhotosUploading(true)

    try {
      if (!projectId || !logId) throw new Error('projectId/logId fehlt')

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Nicht eingeloggt.')

      const inserted: PhotoRow[] = []

      for (const file of Array.from(files)) {
        if (!file.type?.startsWith('image/')) continue

        const compressedFile = await compressImage(file, 1024 * 1024)

        const id = crypto.randomUUID()
        const safe = safeName(compressedFile.name || 'foto.jpg')
        const path = `${user.id}/${projectId}/${logId}/${id}-${safe}`

        const up = await supabase.storage.from(PHOTOS_BUCKET).upload(path, compressedFile, {
          upsert: false,
          contentType: file.type || 'image/jpeg',
        })
        if (up.error) throw up.error

        const ins = await supabase
          .from(PHOTOS_TABLE)
          .insert({
            user_id: user.id,
            project_id: projectId,
            log_id: logId,
            path,
          })
          .select('id, user_id, project_id, log_id, path, created_at')
          .single()

        if (ins.error) throw ins.error
        if (ins.data) inserted.push(ins.data as any)
      }

      setPhotos((prev) => [...inserted, ...prev])
      router.refresh()
    } catch (e: any) {
      setMsg(e?.message ?? 'Upload fehlgeschlagen')
    } finally {
      setPhotosUploading(false)
    }
  }

  async function deletePhoto(p: PhotoRow) {
    setMsg('')

    try {
      const rm = await supabase.storage.from(PHOTOS_BUCKET).remove([p.path])
      if (rm.error) throw rm.error

      if (p.id) {
        const del = await supabase.from(PHOTOS_TABLE).delete().eq('id', p.id)
        if (del.error) throw del.error
      } else {
        const del = await supabase.from(PHOTOS_TABLE).delete().eq('log_id', logId).eq('path', p.path)
        if (del.error) throw del.error
      }

      setPhotos((prev) => prev.filter((x) => x.path !== p.path))
      setPhotoUrls((prev) => {
        const next = { ...prev }
        delete next[p.path]
        return next
      })
    } catch (e: any) {
      setMsg(e?.message ?? 'Löschen fehlgeschlagen')
    }
  }

  if (!projectId || !logId) {
    return (
      <div className="page">
        <h1 className="h1">Tagesbericht bearbeiten</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          projectId/logId fehlt.
        </p>
        <style jsx>{baseStyles}</style>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="topRow">
        <Link className="backLink" href={`/projects/${projectId}/logs/${logId}`}>
          ← Zurück
        </Link>

        <div className="btnRow">
          <button className="btn" onClick={() => router.push(`/projects/${projectId}/logs/${logId}`)} type="button">
            Abbrechen
          </button>

          <button className="btnPrimary" onClick={save} type="button" disabled={saving}>
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      </div>

      {msg ? <div className="error">{msg}</div> : null}

      {loading ? (
        <p className="muted" style={{ marginTop: 16 }}>
          Wird geladen…
        </p>
      ) : (
        <div className="grid" style={{ marginTop: 14 }}>
          <div className="card">
            <div className="label">Datum</div>
            <input
              className="input"
              type="date"
              value={form.log_date}
              onChange={(e) => setForm((p) => ({ ...p, log_date: e.target.value }))}
            />
          </div>

          <div className="card">
            <div className="label">Titel</div>
            <input
              className="input"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="card">
            <div className="label">Teamnamen</div>
            <div className="muted" style={{ marginBottom: 10 }}>
              Mehrere Namen mit Komma oder neuer Zeile trennen. Beispiel: <b>Hans, Peter</b>
            </div>

            <div className="two">
              <div>
                <div className="miniLabel">Arbeiternamen</div>
                <textarea
                  className="textarea"
                  value={form.workers_names}
                  onChange={(e) => setForm((p) => ({ ...p, workers_names: e.target.value }))}
                  placeholder="Hans, Peter"
                />
                <div className="hint">
                  Anzahl: <b>{toTextArray(form.workers_names).length}</b>
                </div>
              </div>

              <div>
                <div className="miniLabel">Bauleiternamen</div>
                <textarea
                  className="textarea"
                  value={form.site_managers_names}
                  onChange={(e) => setForm((p) => ({ ...p, site_managers_names: e.target.value }))}
                  placeholder="Michael, Stefan"
                />
                <div className="hint">
                  Anzahl: <b>{toTextArray(form.site_managers_names).length}</b>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="label">Arbeitsbeschreibung</div>
            <textarea
              className="textarea workArea"
              value={form.work_description}
              onChange={(e) => setForm((p) => ({ ...p, work_description: e.target.value }))}
              placeholder="Was wurde heute gemacht…"
            />
          </div>

          <div className="card">
            <div className="label">Fotos</div>

            <input
              className="file"
              type="file"
              accept="image/*"
              multiple
              disabled={photosUploading}
              onChange={(e) => uploadPhotos(e.target.files)}
            />

            <div className="muted" style={{ marginTop: 8, fontWeight: 900 }}>
              {photosUploading
                ? 'Bilder werden hochgeladen…'
                : `${photos.length} Foto${photos.length === 1 ? '' : 's'} vorhanden`}
            </div>

            {photos.length === 0 ? (
              <div className="muted" style={{ marginTop: 10, fontWeight: 900 }}>
                Noch keine Fotos vorhanden.
              </div>
            ) : (
              <div className="photos" style={{ marginTop: 12 }}>
                {photos.map((p) => {
                  const url = photoUrls[p.path]
                  return (
                    <div key={p.path} className="photoWrap">
                      <a
                        className="photo"
                        href={url || undefined}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => {
                          if (!url) e.preventDefault()
                        }}
                        aria-disabled={!url}
                        title={!url ? 'Wird geladen…' : 'Bild öffnen'}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            url ||
                            'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
                          }
                          alt="Log photo"
                          loading="lazy"
                          decoding="async"
                        />
                      </a>

                      <div className="photoInfo">
                        <div>
                          <span className="photoLabel">Zeit:</span> {formatDateTime(p.created_at)}
                        </div>
                      </div>

                      <button type="button" className="delBtn" onClick={() => deletePhoto(p)}>
                        Löschen
                      </button>
                    </div>
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
        .backLink:hover{color:var(--text);}

        .btnRow{display:flex;gap:10px;flex-wrap:wrap;max-width:100%;}
        .btn,.btnPrimary{
          min-height:44px;padding:10px 14px;border-radius:14px;cursor:pointer;font-weight:950;max-width:100%;
          transition:transform .15s ease, box-shadow .15s ease, opacity .15s ease;
          white-space:nowrap;
        }
        .btn{border:1px solid var(--border);background:var(--chip);color:var(--text);}
        .btn:hover{transform:translateY(-1px);box-shadow:0 10px 30px rgba(0,0,0,.18);}
        .btn:active{transform:translateY(0px) scale(.995);}

        .btnPrimary{border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.10);color:var(--text);}
        .btnPrimary:hover{transform:translateY(-1px);box-shadow:0 10px 30px rgba(0,0,0,.22);}
        .btnPrimary:active{transform:translateY(0px) scale(.995);}
        .btnPrimary:disabled{opacity:.6;cursor:not-allowed;transform:none;box-shadow:none;}

        .grid{display:grid;gap:14px;}
        .two{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
        @media(max-width:720px){.two{grid-template-columns:1fr;}.btn,.btnPrimary{flex:1;}}

        .card{border:1px solid var(--border);background:var(--chip);border-radius:18px;padding:16px;overflow:hidden;}
        .label{color:var(--muted);font-weight:950;font-size:14px;margin-bottom:8px;}
        .miniLabel{color:var(--muted);font-weight:950;font-size:13px;margin-bottom:6px;}
        .hint{margin-top:8px;color:var(--muted);font-weight:900;}

        .input,.textarea{
          width:100%;
          border:1px solid var(--border);
          background:rgba(255,255,255,.04);
          color:var(--text);
          border-radius:14px;
          padding:12px;
          font-weight:900;
          box-sizing:border-box;
        }

        .textarea{
          min-height:110px;
          resize:vertical;
          white-space:pre-wrap;
        }

        .workArea{
          min-height:140px;
          max-height:260px;
          overflow:auto;
        }

        .file{width:100%;max-width:100%;}

        .photos{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr));}
        @media(max-width:720px){.photos{grid-template-columns:1fr;}}

        .photoWrap{display:flex;flex-direction:column;gap:8px;}
        .photo{
          display:block;
          border:1px solid var(--border);
          border-radius:16px;
          overflow:hidden;
          background:rgba(255,255,255,.03);
        }
        .photo[aria-disabled="true"]{opacity:.6;pointer-events:none;}
        .photo img{
          width:100%;
          height:220px;
          object-fit:cover;
          display:block;
        }

        .photoInfo{
          color:var(--muted);
          font-weight:900;
          font-size:13px;
        }

        .photoLabel{
          color:var(--text);
          opacity:.92;
        }

        .delBtn{
          border:1px solid var(--border);
          background:rgba(255,255,255,.04);
          color:var(--text);
          border-radius:14px;
          padding:10px 12px;
          font-weight:950;
          cursor:pointer;
        }
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
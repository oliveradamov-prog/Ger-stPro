'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

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
  remarks: string | null
  external_company: string | null
  workers_count?: number | null
  site_managers_count?: number | null
  workers_names?: string[] | null
  site_managers_names?: string[] | null
}

type WorkerRow = {
  id: string
  log_id?: string
  company: string
  name: string
  hours: string
  time_range: string
  sort_order?: number | null
}

type MeetingRow = {
  id: string
  log_id?: string
  thema: string
  termin: string
}

type EventRow = {
  id: string
  log_id?: string
  text: string
  erlediger: string
  status: string
  termin: string
}

function makeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

function asString(v: any) {
  if (v == null) return ''
  if (Array.isArray(v)) return v.join(', ')
  return String(v)



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

  function cleanText(text: string) {
    return text
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u00A0/g, ' ')
  }

function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, '_')
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('de-DE')
}

function emptyWorkerRow(sortOrder = 0): WorkerRow {
  return {
    id: makeId(),
    company: '',
    name: '',
    hours: '',
    time_range: '',
    sort_order: sortOrder,
  }
}

function emptyMeetingRow(): MeetingRow {
  return {
    id: makeId(),
    thema: '',
    termin: '',
  }
}

function emptyEventRow(): EventRow {
  return {
    id: makeId(),
    text: '',
    erlediger: '',
    status: '',
    termin: '',
  }
}

function moveItem<T>(list: T[], from: number, to: number) {
  const copy = [...list]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
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
    remarks: '',
    external_company: '',
    site_managers_names: '',
  })

  const [workers, setWorkers] = useState<WorkerRow[]>([emptyWorkerRow(1)])
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [meetings, setMeetings] = useState<MeetingRow[]>([emptyMeetingRow()])
  const [events, setEvents] = useState<EventRow[]>([emptyEventRow()])
  const [dropIndex, setDropIndex] = useState<number | null>(null)

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

        const [
          logRes,
          workersRes,
          meetingsRes,
          eventsRes,
          photosRes,
        ] = await Promise.all([
          supabase
            .from('daily_logs')
            .select(
              'id, project_id, user_id, log_date, description, work_description, remarks, external_company, workers_count, site_managers_count, workers_names, site_managers_names'
            )
            .eq('id', logId)
            .eq('project_id', projectId)
            .single(),
          supabase
            .from('daily_log_workers')
            .select('id, log_id, company, name, hours, time_range, sort_order')
            .eq('log_id', logId)
            .order('sort_order', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true }),
          supabase
            .from('daily_log_meetings')
            .select('id, log_id, thema, termin')
            .eq('log_id', logId)
            .order('created_at', { ascending: true }),
          supabase
            .from('daily_log_events')
            .select('id, log_id, text, erlediger, status, termin')
            .eq('log_id', logId)
            .order('created_at', { ascending: true }),
          supabase
            .from(PHOTOS_TABLE)
            .select('id, user_id, project_id, log_id, path, created_at')
            .eq('project_id', projectId)
            .eq('log_id', logId)
            .order('created_at', { ascending: false }),
        ])

        if (logRes.error) throw logRes.error
        if (workersRes.error) throw workersRes.error
        if (meetingsRes.error) throw meetingsRes.error
        if (eventsRes.error) throw eventsRes.error
        if (photosRes.error) console.warn(photosRes.error.message)

        const log = logRes.data as DailyLog | null
        if (!log) throw new Error('Log nicht gefunden')

        if (!cancelled) {
          setForm({
            log_date: log.log_date || '',
            description: log.description ?? '',
            work_description: log.work_description ?? '',
            remarks: log.remarks ?? '',
            external_company: log.external_company ?? '',
            site_managers_names: asString(log.site_managers_names),
          })

          setWorkers(
            (workersRes.data as any[])?.length
              ? (workersRes.data as any[]).map((row, index) => ({
                  id: row.id,
                  log_id: row.log_id,
                  company: row.company ?? '',
                  name: row.name ?? '',
                  hours: row.hours == null ? '' : String(row.hours).replace('.', ','),
                  time_range: row.time_range ?? '',
                  sort_order: row.sort_order ?? index + 1,
                }))
              : [emptyWorkerRow(1)]
          )

          setMeetings(
            (meetingsRes.data as any[])?.length
              ? (meetingsRes.data as any[]).map((row) => ({
                  id: row.id,
                  log_id: row.log_id,
                  thema: row.thema ?? '',
                  termin: row.termin ?? '',
                }))
              : [emptyMeetingRow()]
          )

          setEvents(
            (eventsRes.data as any[])?.length
              ? (eventsRes.data as any[]).map((row) => ({
                  id: row.id,
                  log_id: row.log_id,
                  text: row.text ?? '',
                  erlediger: row.erlediger ?? '',
                  status: row.status ?? '',
                  termin: row.termin ?? '',
                }))
              : [emptyEventRow()]
          )

          setPhotos((photosRes.data as PhotoRow[]) ?? [])
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

  function updateWorker(id: string, patch: Partial<WorkerRow>) {
    setWorkers((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    )
  }

  function moveWorkerUp(index: number) {
    if (index === 0) return
    setWorkers((prev) => moveItem(prev, index, index - 1))
  }

  function moveWorkerDown(index: number) {
    setWorkers((prev) => {
      if (index >= prev.length - 1) return prev
      return moveItem(prev, index, index + 1)
    })
  }

  function updateMeeting(id: string, patch: Partial<MeetingRow>) {
    setMeetings((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    )
  }

  function updateEvent(id: string, patch: Partial<EventRow>) {
    setEvents((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    )
  }

  function removeWorker(id: string) {
    setWorkers((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== id)))
  }

  function removeMeeting(id: string) {
    setMeetings((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== id)))
  }

  function removeEvent(id: string) {
    setEvents((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== id)))
  }

  async function save() {
    try {
      alert('SAVE CLICKED')
      setMsg('')
      setSaving(true)

      console.log('SAVE START')
      console.log('LOG ID:', logId)
      console.log('PROJECT ID:', projectId)

      const cleanedWorkers = workers
        .map((w, index) => ({
          log_id: logId,
          company: w.company?.trim() || null,
          name: w.name?.trim() || '',
          hours:
            w.hours === '' || w.hours == null
              ? null
              : Number(String(w.hours).replace(',', '.')),
          time_range: w.time_range?.trim() || null,
          sort_order: index,
        }))
        .filter((w) => w.company || w.name || w.hours != null || w.time_range)

      const cleanedMeetings = meetings
        .map((m) => ({
          id: m.id,
          log_id: logId,
          thema: m.thema?.trim() || '',
          termin: m.termin?.trim() || '',
        }))
        .filter((m) => m.thema || m.termin)

      const cleanedEvents = events
        .map((e) => ({
          id: e.id,
          log_id: logId,
          text: e.text?.trim() || '',
          erlediger: e.erlediger?.trim() || '',
          status: e.status?.trim() || '',
          termin: e.termin?.trim() || '',
        }))
        .filter((e) => e.text || e.erlediger || e.status || e.termin)

      const workersNames = cleanedWorkers
        .map((w) => w.name)
        .filter(Boolean)

      const siteManagersNames = toTextArray(form.site_managers_names)

      console.log('MAIN UPDATE PAYLOAD', {
        log_date: form.log_date,
        description: form.description,
        work_description: form.work_description,
        remarks: form.remarks,
        external_company: form.external_company,
        workers_count: workersNames.length,
        site_managers_count: siteManagersNames.length,
        workers_names: workersNames,
        site_managers_names: siteManagersNames,
      })

      // ===== MAIN UPDATE (FIXED) =====
      const { error: updateError } = await supabase
      .from('daily_logs')
      .update({
        log_date: form.log_date,
        description: cleanText(form.description),
        work_description: cleanText(form.work_description),
        remarks: cleanText(form.remarks),
        external_company: form.external_company,
        workers_count: workers.map(w => w.name.trim()).filter(Boolean).length,
        site_managers_count: toTextArray(form.site_managers_names).length,
        workers_names: workers.map(w => w.name.trim()).filter(Boolean),
        site_managers_names: toTextArray(form.site_managers_names),
      })
      .eq('id', logId)
      .eq('project_id', projectId)

      if (updateError) {
        console.error('MAIN UPDATE ERROR:', updateError)
        throw updateError
      }

      console.log('MAIN UPDATE OK')

      // ===== WORKERS =====
      console.log('UPSERT WORKERS')

      const { error: deleteWorkersError } = await supabase
        .from('daily_log_workers')
        .delete()
        .eq('log_id', logId)

      if (deleteWorkersError) {
        console.error('WORKERS DELETE ERROR:', deleteWorkersError)
        throw deleteWorkersError
      }

      console.log('WORKERS DELETE OK')

      if (cleanedWorkers.length > 0) {
        console.log('WORKERS INSERT PAYLOAD', cleanedWorkers)

        const { error: insertWorkersError } = await supabase
          .from('daily_log_workers')
          .insert(cleanedWorkers)

        if (insertWorkersError) {
          console.error('WORKERS INSERT ERROR:', insertWorkersError)
          throw insertWorkersError
        }
      }

      console.log('WORKERS OK')

      // ===== MEETINGS =====
      console.log('UPSERT MEETINGS')

      const { error: deleteMeetingsError } = await supabase
        .from('daily_log_meetings')
        .delete()
        .eq('log_id', logId)

      if (deleteMeetingsError) {
        console.error('MEETINGS DELETE ERROR:', deleteMeetingsError)
        throw deleteMeetingsError
      }

      console.log('MEETINGS DELETE OK')

      if (cleanedMeetings.length > 0) {
        console.log('MEETINGS INSERT PAYLOAD', cleanedMeetings)

        const { error: insertMeetingsError } = await supabase
          .from('daily_log_meetings')
          .insert(cleanedMeetings)

        if (insertMeetingsError) {
          console.error('MEETINGS INSERT ERROR:', insertMeetingsError)
          throw insertMeetingsError
        }
      }

      console.log('MEETINGS OK')

      // ===== EVENTS =====
      console.log('UPSERT EVENTS')

      const { error: deleteEventsError } = await supabase
        .from('daily_log_events')
        .delete()
        .eq('log_id', logId)

      if (deleteEventsError) {
        console.error('EVENTS DELETE ERROR:', deleteEventsError)
        throw deleteEventsError
      }

      console.log('EVENTS DELETE OK')

      if (cleanedEvents.length > 0) {
        console.log('EVENTS INSERT PAYLOAD', cleanedEvents)

        const { error: insertEventsError } = await supabase
          .from('daily_log_events')
          .insert(cleanedEvents)

        if (insertEventsError) {
          console.error('EVENTS INSERT ERROR:', insertEventsError)
          throw insertEventsError
        }
      }

      console.log('EVENTS OK')
      console.log('SAVE SUCCESS')

      setMsg('Gespeichert!')
      router.push(`/projects/${projectId}/logs/${logId}`)
    } catch (e: any) {
      console.error('SAVE FAILED:', e)
      setMsg(e?.message ?? 'Speichern fehlgeschlagen.')
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

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, plan, trial_ends_at')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw new Error('Profil konnte nicht geprüft werden.')
      }

      const isAdmin = profile?.role === 'admin'
      const isPro = profile?.plan === 'pro'

      let trialActive = false
      if (profile?.trial_ends_at) {
        trialActive = new Date(profile.trial_ends_at).getTime() > Date.now()
      }

      if (!isAdmin && !isPro && !trialActive) {
        throw new Error('Deine Testphase ist abgelaufen. Bitte gehe auf Upgrade.')
      }

      const inserted: PhotoRow[] = []

      for (const file of Array.from(files)) {
        if (!file.type?.startsWith('image/')) continue

        const compressedFile = await compressImage(file, 1024 * 1024)

        const id = crypto.randomUUID()
        const safe = safeName(compressedFile.name || 'foto.jpg')
        const path = `${user.id}/${projectId}/${logId}/${id}-${safe}`

        const up = await supabase.storage.from(PHOTOS_BUCKET).upload(path, compressedFile, {
          upsert: false,
          contentType: compressedFile.type || 'image/jpeg',
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
            <div className="label">Firma</div>
            <input
              className="input"
              value={form.external_company}
              onChange={(e) => setForm((p) => ({ ...p, external_company: e.target.value }))}
              placeholder="z. B. Intering"
            />
          </div>

          <div className="card">
            <div className="label">Bauleiternamen</div>
            <textarea
              className="textarea"
              value={form.site_managers_names}
              onChange={(e) => setForm((p) => ({ ...p, site_managers_names: e.target.value }))}
              placeholder="Michael, Stefan…"
            />
            <div className="hint">
              Anzahl: <b>{toTextArray(form.site_managers_names).length}</b>
            </div>
          </div>

          <div className="card">
            <div className="sectionTop">
              <div className="label" style={{ marginBottom: 0 }}>
                Firmen/ Mitarbeiter / Stunden / Zeit
              </div>
              <button
                type="button"
                className="miniBtn"
                onClick={() =>
                  setWorkers((prev) => [...prev, emptyWorkerRow(prev.length + 1)])
                }
              >
                + Zeile
              </button>
            </div>

            <div className="rows">
              {workers.map((row, idx) => (
          <div
            key={row.id}
            className={`subCard ${dragIndex === idx ? 'dragging' : ''} ${dropIndex === idx ? 'dropTarget' : ''}`}
            draggable
            onDragStart={() => {
              setDragIndex(idx)
              setDropIndex(idx)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              if (dropIndex !== idx) setDropIndex(idx)
            }}
            onDragEnter={() => {
              if (dropIndex !== idx) setDropIndex(idx)
            }}
            onDragEnd={() => {
              setDragIndex(null)
              setDropIndex(null)
            }}
            onDrop={() => {
              if (dragIndex === null || dragIndex === idx) {
                setDragIndex(null)
                setDropIndex(null)
                return
              }

              setWorkers((prev) => {
                const updated = [...prev]
                const dragged = updated[dragIndex]

                updated.splice(dragIndex, 1)
                updated.splice(idx, 0, dragged)

                return updated
              })

              setDragIndex(null)
              setDropIndex(null)
            }}
          >
                  <div className="rowTop">
                    <div className="miniTitle">Mitarbeiter #{idx + 1}</div>

                    <div className="workerActions">
                      <button
                        type="button"
                        className="miniMove"
                        onClick={() => moveWorkerUp(idx)}
                        disabled={idx === 0}
                        title="Nach oben"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="miniMove"
                        onClick={() => moveWorkerDown(idx)}
                        disabled={idx === workers.length - 1}
                        title="Nach unten"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="miniDanger"
                        onClick={() => removeWorker(row.id)}
                      >
                        Entfernen
                      </button>
                    </div>
                  </div>

                  <div className="four">
                    <input
                      className="input"
                      value={row.company}
                      onChange={(e) => updateWorker(row.id, { company: e.target.value })}
                      placeholder="Firma"
                    />
                    <input
                      className="input"
                      value={row.name}
                      onChange={(e) => updateWorker(row.id, { name: e.target.value })}
                      placeholder="Mitarbeiter"
                    />
                    <input
                      className="input"
                      value={row.hours}
                      onChange={(e) => updateWorker(row.id, { hours: e.target.value })}
                      placeholder="Stunden"
                    />
                    <input
                      className="input"
                      value={row.time_range}
                      onChange={(e) => updateWorker(row.id, { time_range: e.target.value })}
                      placeholder="Zeit (z. B. 7.00 – 16.30)"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="label">Ausgeführte Arbeiten</div>
            <textarea
              className="textarea workArea"
              value={form.work_description}
              onChange={(e) => setForm((p) => ({ ...p, work_description: e.target.value }))}
              placeholder="Was wurde heute gemacht…"
            />
          </div>

          <div className="card">
            <div className="label">Bemerkungen</div>
            <textarea
              className="textarea"
              value={form.remarks}
              onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
              placeholder="Zusätzliche Hinweise, Sicherheit, Besonderheiten…"
            />
          </div>

          <div className="card">
            <div className="sectionTop">
              <div className="label" style={{ marginBottom: 0 }}>
                Besprechungen
              </div>
              <button
                type="button"
                className="miniBtn"
                onClick={() => setMeetings((prev) => [...prev, emptyMeetingRow()])}
              >
                + Zeile
              </button>
            </div>

            <div className="rows">
              {meetings.map((row, idx) => (
                <div key={row.id} className="subCard">
                  <div className="rowTop">
                    <div className="miniTitle">Besprechung #{idx + 1}</div>
                    <button
                      type="button"
                      className="miniDanger"
                      onClick={() => removeMeeting(row.id)}
                    >
                      Entfernen
                    </button>
                  </div>

                  <div className="two">
                    <input
                      className="input"
                      value={row.thema}
                      onChange={(e) => updateMeeting(row.id, { thema: e.target.value })}
                      placeholder="Thema"
                    />
                    <input
                      className="input"
                      value={row.termin}
                      onChange={(e) => updateMeeting(row.id, { termin: e.target.value })}
                      placeholder="Termin"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="sectionTop">
              <div className="label" style={{ marginBottom: 0 }}>
                Vorkommnisse
              </div>
              <button
                type="button"
                className="miniBtn"
                onClick={() => setEvents((prev) => [...prev, emptyEventRow()])}
              >
                + Zeile
              </button>
            </div>

            <div className="rows">
              {events.map((row, idx) => (
                <div key={row.id} className="subCard">
                  <div className="rowTop">
                    <div className="miniTitle">Vorkommnis #{idx + 1}</div>
                    <button
                      type="button"
                      className="miniDanger"
                      onClick={() => removeEvent(row.id)}
                    >
                      Entfernen
                    </button>
                  </div>

                  <div className="gridInner">
                    <textarea
                      className="textarea"
                      value={row.text}
                      onChange={(e) => updateEvent(row.id, { text: e.target.value })}
                      placeholder="Vorkommnis / Beschreibung"
                    />
                    <div className="three">
                      <input
                        className="input"
                        value={row.erlediger}
                        onChange={(e) => updateEvent(row.id, { erlediger: e.target.value })}
                        placeholder="Erlediger"
                      />
                      <input
                        className="input"
                        value={row.status}
                        onChange={(e) => updateEvent(row.id, { status: e.target.value })}
                        placeholder="Status"
                      />
                      <input
                        className="input"
                        value={row.termin}
                        onChange={(e) => updateEvent(row.id, { termin: e.target.value })}
                        placeholder="Termin"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
        .gridInner{display:grid;gap:12px;}
        .two{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
        .three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
        .four{display:grid;grid-template-columns:1.2fr 1.2fr .7fr 1fr;gap:12px;}
        @media(max-width:900px){.four{grid-template-columns:1fr 1fr;}}
        @media(max-width:720px){.two,.three,.four{grid-template-columns:1fr;}.btn,.btnPrimary{flex:1;}}

        .card{border:1px solid var(--border);background:var(--chip);border-radius:18px;padding:16px;overflow:hidden;}
        .subCard{
          border:1px solid rgba(255,255,255,.08);
          border-radius:16px;
          padding:12px;
          background:rgba(255,255,255,.02);
          transition:
            transform .16s ease,
            opacity .16s ease,
            border-color .16s ease,
            box-shadow .16s ease,
            background .16s ease;
        }

        .subCard[draggable="true"]{
          cursor:grab;
        }

        .subCard.dragging{
          opacity:.72;
          transform:scale(.985);
          border-color:rgba(255,255,255,.24);
          box-shadow:0 14px 30px rgba(0,0,0,.22);
          background:rgba(255,255,255,.06);
        }

        .subCard.dropTarget{
          border-color:rgba(255,255,255,.35);
          background:rgba(255,255,255,.08);
          box-shadow:0 0 0 2px rgba(255,255,255,.08);
        }
        .rows{display:grid;gap:12px;margin-top:12px;}
        .sectionTop{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;}
        .rowTop{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;}
        .workerActions{display:flex;gap:8px;flex-wrap:wrap;}

        .label{color:var(--muted);font-weight:950;font-size:14px;margin-bottom:8px;}
        .miniLabel{color:var(--muted);font-weight:950;font-size:13px;margin-bottom:6px;}
        .miniTitle{color:var(--text);font-weight:950;font-size:14px;}
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
          max-height:520px;
          overflow:auto;
        }

        .miniBtn,.miniDanger,.miniMove{
          min-height:38px;
          padding:8px 12px;
          border-radius:12px;
          cursor:pointer;
          font-weight:900;
          border:1px solid var(--border);
          background:var(--chip);
          color:var(--text);
        }

        .miniDanger{
          color:#ffb4b4;
        }

        .miniMove:disabled{
          opacity:.45;
          cursor:not-allowed;
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
'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const COL_WORKERS_COUNT = 'workers_count'
const COL_SITE_MANAGERS_COUNT = 'site_managers_count'
const COL_WORKERS_NAMES = 'workers_names'
const COL_SITE_MANAGERS_NAMES = 'site_managers_names'

type WorkerRow = {
  id: string
  company: string
  name: string
  hours: string
  time_range: string
}

type MeetingRow = {
  id: string
  thema: string
  termin: string
}

type EventRow = {
  id: string
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

function toTextArray(v: string): string[] {
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

function emptyWorkerRow(): WorkerRow {
  return {
    id: makeId(),
    company: '',
    name: '',
    hours: '',
    time_range: '',
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

export default function NewLogForm() {
  const router = useRouter()
  const params = useParams()

  const projectId = useMemo(() => {
    const raw = (params as any)?.projectId
    return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
  }, [params])

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [form, setForm] = useState({
    log_date: new Date().toISOString().slice(0, 10),
    description: '',
    work_description: '',
    remarks: '',
    external_company: '',
    site_managers_names: '',
  })

  const [workers, setWorkers] = useState<WorkerRow[]>([
    emptyWorkerRow(),
  ])

  const [meetings, setMeetings] = useState<MeetingRow[]>([
    emptyMeetingRow(),
  ])

  const [events, setEvents] = useState<EventRow[]>([
    emptyEventRow(),
  ])

  async function create() {
    setMsg('')
    setSaving(true)

    let createdLogId: string | null = null

    try {
      if (!projectId) throw new Error('Projekt-ID in der Route fehlt.')
      if (!form.log_date) throw new Error('Bitte ein Datum auswählen.')
      if (!form.description.trim()) throw new Error('Bitte einen Titel eingeben.')

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw new Error(authError.message)
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

      const cleanedWorkers = workers
        .map((row) => ({
          company: row.company.trim() || null,
          name: row.name.trim(),
          hours: row.hours.trim(),
          time_range: row.time_range.trim() || null,
        }))
        .filter((row) => row.name)

      const workerNames = cleanedWorkers.map((row) => row.name)

      const managerArr = toTextArray(form.site_managers_names)

      const cleanedMeetings = meetings
        .map((row) => ({
          thema: row.thema.trim() || null,
          termin: row.termin.trim() || null,
        }))
        .filter((row) => row.thema || row.termin)

      const cleanedEvents = events
        .map((row) => ({
          text: row.text.trim() || null,
          erlediger: row.erlediger.trim() || null,
          status: row.status.trim() || null,
          termin: row.termin.trim() || null,
        }))
        .filter((row) => row.text || row.erlediger || row.status || row.termin)

      const payload: any = {
        project_id: projectId,
        user_id: user.id,
        log_date: form.log_date,
        description: form.description.trim(),
        work_description: form.work_description.trim() || '',
        remarks: form.remarks.trim() || null,
        external_company: form.external_company.trim() || null,
        [COL_WORKERS_NAMES]: workerNames,
        [COL_SITE_MANAGERS_NAMES]: managerArr,
        [COL_WORKERS_COUNT]: workerNames.length,
        [COL_SITE_MANAGERS_COUNT]: managerArr.length,
      }

      const { data, error } = await supabase
        .from('daily_logs')
        .insert(payload)
        .select('id')
        .single()

      if (error) throw error
      if (!data?.id) throw new Error('Eintrag erstellt, aber keine ID zurückgegeben.')

      createdLogId = data.id

      if (cleanedWorkers.length > 0) {
        const workerPayload = cleanedWorkers.map((row) => ({
          log_id: data.id,
          company: row.company,
          name: row.name,
          hours: row.hours ? Number(row.hours.replace(',', '.')) : null,
          time_range: row.time_range,
        }))

        const { error: workerError } = await supabase
          .from('daily_log_workers')
          .insert(workerPayload)

        if (workerError) throw workerError
      }

      if (cleanedMeetings.length > 0) {
        const meetingPayload = cleanedMeetings.map((row) => ({
          log_id: data.id,
          thema: row.thema,
          termin: row.termin,
        }))

        const { error: meetingError } = await supabase
          .from('daily_log_meetings')
          .insert(meetingPayload)

        if (meetingError) throw meetingError
      }

      if (cleanedEvents.length > 0) {
        const eventPayload = cleanedEvents.map((row) => ({
          log_id: data.id,
          text: row.text,
          erlediger: row.erlediger,
          status: row.status,
          termin: row.termin,
        }))

        const { error: eventError } = await supabase
          .from('daily_log_events')
          .insert(eventPayload)

        if (eventError) throw eventError
      }

      router.push(`/projects/${projectId}/logs/${data.id}`)
      router.refresh()
    } catch (e: any) {
      if (createdLogId) {
        await supabase.from('daily_logs').delete().eq('id', createdLogId)
      }

      setMsg(e?.message ?? 'Erstellen fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  function updateWorker(id: string, patch: Partial<WorkerRow>) {
    setWorkers((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    )
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

  if (!projectId) {
    return (
      <div className="page">
        <h1 className="h1">Neuer Tagesbericht</h1>
        <p className="muted" style={{ marginTop: 10 }}>
          Projekt-ID fehlt.
        </p>
        <style jsx>{baseStyles}</style>
      </div>
    )
  }

  const managersCount = toTextArray(form.site_managers_names).length

  return (
    <div className="page">
      <div className="topRow">
        <Link className="backLink" href={`/projects/${projectId}`}>
          ← Zurück
        </Link>

        <div className="btnRow">
          <button className="btn" onClick={() => router.push(`/projects/${projectId}`)} type="button">
            Abbrechen
          </button>
          <button className="btnPrimary" onClick={create} type="button" disabled={saving}>
            {saving ? 'Speichert…' : 'Erstellen'}
          </button>
        </div>
      </div>

      <h1 className="h1" style={{ marginTop: 10 }}>
        Neuer Tagesbericht
      </h1>

      {msg ? <div className="error">{msg}</div> : null}

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
            placeholder="z. B. Freitag 20.03.2026"
          />
        </div>

        <div className="card">
          <div className="label">Fremdfirma / Bedolgozó cég</div>
          <input
            className="input"
            value={form.external_company}
            onChange={(e) => setForm((p) => ({ ...p, external_company: e.target.value }))}
            placeholder="z. B. Super Crow / Butting"
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
            Anzahl: <b>{managersCount}</b>
          </div>
        </div>

        <div className="card">
          <div className="sectionTop">
            <div className="label" style={{ marginBottom: 0 }}>
              Mitarbeiter / Firmen / Stunden / Zeit
            </div>
            <button
              type="button"
              className="miniBtn"
              onClick={() => setWorkers((prev) => [...prev, emptyWorkerRow()])}
            >
              + Zeile
            </button>
          </div>

          <div className="rows">
            {workers.map((row, idx) => (
              <div key={row.id} className="subCard">
                <div className="rowTop">
                  <div className="miniTitle">Mitarbeiter #{idx + 1}</div>
                  <button
                    type="button"
                    className="miniDanger"
                    onClick={() => removeWorker(row.id)}
                  >
                    Entfernen
                  </button>
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
            placeholder="Zusätzliche Hinweise, Besonderheiten, Verspätung, Sicherheit usw."
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
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="label">Fotos</div>
          <div className="muted" style={{ fontWeight: 900 }}>
            Fotos können nach dem Erstellen des Tagesberichts im Bereich „Bearbeiten“ hochgeladen werden.
          </div>
        </div>
      </div>

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
        .subCard{border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:12px;background:rgba(255,255,255,.02);}
        .rows{display:grid;gap:12px;margin-top:12px;}
        .sectionTop{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;}
        .rowTop{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;}

        .label{color:var(--muted);font-weight:950;font-size:14px;margin-bottom:8px;}
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
          min-height:150px;
          max-height:320px;
          overflow:auto;
        }

        .miniBtn,.miniDanger{
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
      `}</style>
    </div>
  )
}

const baseStyles = `
  .page{max-width:980px;margin:0 auto;padding:1rem;color:var(--text);overflow-x:hidden;}
  .h1{font-size:54px;font-weight:950;margin:0;color:var(--text);letter-spacing:-0.4px;word-break:break-word;}
  .muted{color:var(--muted);font-weight:800;}
  .error{margin-top:12px;color:#ff6b6b;font-weight:950;}
`
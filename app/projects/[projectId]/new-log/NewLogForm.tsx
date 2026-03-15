'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const COL_WORKERS_COUNT = 'workers_count'
const COL_SITE_MANAGERS_COUNT = 'site_managers_count'
const COL_WORKERS_NAMES = 'workers_names'
const COL_SITE_MANAGERS_NAMES = 'site_managers_names'

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
    workers_names: '',
    site_managers_names: '',
  })

  async function create() {
    setMsg('')
    setSaving(true)

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

      const workersArr = toTextArray(form.workers_names)
      const managersArr = toTextArray(form.site_managers_names)

      const payload: any = {
        project_id: projectId,
        user_id: user.id,
        log_date: form.log_date,
        description: form.description.trim(),
        work_description: form.work_description.trim() || null,
        [COL_WORKERS_NAMES]: workersArr,
        [COL_SITE_MANAGERS_NAMES]: managersArr,
        [COL_WORKERS_COUNT]: workersArr.length,
        [COL_SITE_MANAGERS_COUNT]: managersArr.length,
      }

      const { data, error } = await supabase
        .from('daily_logs')
        .insert(payload)
        .select('id')
        .single()

      if (error) throw error
      if (!data?.id) throw new Error('Eintrag erstellt, aber keine ID zurückgegeben.')

      router.push(`/projects/${projectId}/logs/${data.id}`)
      router.refresh()
    } catch (e: any) {
      setMsg(e?.message ?? 'Erstellen fehlgeschlagen')
    } finally {
      setSaving(false)
    }
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

  const workersCount = toTextArray(form.workers_names).length
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
            placeholder="Kurzer Titel…"
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
                placeholder="Hans, Peter…"
              />
              <div className="hint">
                Anzahl: <b>{workersCount}</b>
              </div>
            </div>

            <div>
              <div className="miniLabel">Bauleiternamen</div>
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
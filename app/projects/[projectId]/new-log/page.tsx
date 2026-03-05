'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const COL_WORKERS_COUNT = 'workers_count'
const COL_SITE_MANAGERS_COUNT = 'site_managers_count'
const COL_WORKERS_NAMES = 'workers_names'
const COL_SITE_MANAGERS_NAMES = 'site_managers_names'

const PHOTOS_BUCKET = process.env.NEXT_PUBLIC_PHOTOS_BUCKET || 'DAILY-LOG-PHOTOS'
const PHOTOS_TABLE = 'daily_log_photos'

// ✅ biztos tömbbé alakítás text[] mezőkhöz
const toTextArray = (v: any): string[] => {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean)

  if (typeof v === 'string') {
    // elfogadjuk:
    // "Zita"  -> ["Zita"]
    // "Zita, Pista" -> ["Zita","Pista"]
    // több sor -> spliteljük vesszőre + sortörésre
    return v
      .split(/[,;\n]/g)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  return []
}

export default function NewLogPage() {
  const params = useParams()
  const router = useRouter()

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
    workers_count: 0,
    site_managers_count: 0,
    workers_names: '',
    site_managers_names: '',
  })

  async function create() {
    setMsg('')
    setSaving(true)

    try {
      if (!projectId) throw new Error('Missing projectId')

      const { data: auth, error: authErr } = await supabase.auth.getUser()
      if (authErr) throw new Error(authErr.message)

      const userId = auth?.user?.id
      if (!userId) throw new Error('Not logged in')

      // ✅ tömbbé alakítás
      const w = toTextArray(form.workers_names)
      const sm = toTextArray(form.site_managers_names)

      const payload: any = {
        project_id: projectId,
        user_id: userId,
        log_date: form.log_date,
        description: form.description?.trim() || null,
        work_description: form.work_description?.trim() || null,

        // ✅ count mindig a tömb hossza
        [COL_WORKERS_COUNT]: w.length,
        [COL_SITE_MANAGERS_COUNT]: sm.length,

        // ✅ text[] mezők -> tömb!
        [COL_WORKERS_NAMES]: w,
        [COL_SITE_MANAGERS_NAMES]: sm,
      }

      const { data, error } = await supabase.from('daily_logs').insert(payload).select('id').single()
      if (error) throw error
      if (!data?.id) throw new Error('Insert ok but no id returned')

      router.push(`/projects/${projectId}/logs/${data.id}/edit`)
      router.refresh()
    } catch (e: any) {
      setMsg(e?.message ?? 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  if (!projectId) {
    return (
      <div className="page">
        <h1 className="h1">New Daily Log</h1>
        <p className="muted">Missing projectId.</p>
        <style jsx>{baseStyles}</style>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="topRow">
        <Link className="backLink" href={`/projects/${projectId}`}>
          ← Back
        </Link>

        <div className="btnRow">
          <button className="btn" onClick={() => router.push(`/projects/${projectId}`)} type="button">
            Cancel
          </button>
          <button className="btnPrimary" onClick={create} type="button" disabled={saving}>
            {saving ? 'Saving…' : 'Create'}
          </button>
        </div>
      </div>

      <h1 className="h1" style={{ marginTop: 10 }}>
        New Daily Log
      </h1>

      {msg ? <div className="error">{msg}</div> : null}

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
            <div className="muted" style={{ marginTop: 8 }}>
              (Auto-save: a mentésnél a nevek alapján lesz kiszámolva)
            </div>
          </div>

          <div className="card">
            <div className="label">Site managers count</div>
            <input
              className="input"
              type="number"
              value={form.site_managers_count}
              onChange={(e) => setForm((p) => ({ ...p, site_managers_count: Number(e.target.value || 0) }))}
            />
            <div className="muted" style={{ marginTop: 8 }}>
              (Auto-save: a mentésnél a nevek alapján lesz kiszámolva)
            </div>
          </div>
        </div>

        <div className="two">
          <div className="card">
            <div className="label">Workers names</div>
            <textarea
              className="textarea"
              value={form.workers_names}
              onChange={(e) => setForm((p) => ({ ...p, workers_names: e.target.value }))}
              placeholder={`Pl.: Zita, Pista\nvagy soronként:\nZita\nPista`}
            />
          </div>
          <div className="card">
            <div className="label">Site managers names</div>
            <textarea
              className="textarea"
              value={form.site_managers_names}
              onChange={(e) => setForm((p) => ({ ...p, site_managers_names: e.target.value }))}
              placeholder={`Pl.: Béla\nvagy: Béla, János`}
            />
          </div>
        </div>

        <div className="card">
          <div className="label">Work description</div>
          <textarea className="textarea" value={form.work_description} onChange={(e) => setForm((p) => ({ ...p, work_description: e.target.value }))} />
        </div>

        <div className="card">
          <div className="label">Photos</div>
          <div className="muted" style={{ fontWeight: 900 }}>
            After creating, you can upload photos in Edit.
          </div>
        </div>
      </div>

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
      `}</style>
    </div>
  )
}

const baseStyles = `
  .page{max-width:980px;margin:0 auto;padding:1rem;color:var(--text);overflow-x:hidden;}
  .h1{font-size:54px;font-weight:950;margin:0;color:var(--text);letter-spacing:-0.4px;}
  .muted{color:var(--muted);font-weight:800;}
  .error{margin-top:12px;color:#ff6b6b;font-weight:950;}
`
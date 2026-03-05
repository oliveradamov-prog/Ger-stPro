'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

/** ✅ mindig text[]-t ad vissza (Supabase text[] mezőkhöz) */
const toTextArray = (v: any): string[] => {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean)
  if (typeof v === 'string') {
    return v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

export default function NewLogForm() {
  const router = useRouter()
  const params = useParams() as { projectId?: string | string[] }

  const projectId =
    typeof params?.projectId === 'string'
      ? params.projectId
      : Array.isArray(params?.projectId)
        ? params.projectId[0]
        : ''

  const [title, setTitle] = useState('')
  const [logDate, setLogDate] = useState('')
  const [workDescription, setWorkDescription] = useState('')

  const [workerInput, setWorkerInput] = useState('')
  const [siteManagerInput, setSiteManagerInput] = useState('')
  const [workersNames, setWorkersNames] = useState<string[]>([])
  const [siteManagersNames, setSiteManagersNames] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function addWorker() {
    const n = workerInput.trim()
    if (!n) return
    setWorkersNames((p) => (p.includes(n) ? p : [...p, n]))
    setWorkerInput('')
  }

  function addSiteManager() {
    const n = siteManagerInput.trim()
    if (!n) return
    setSiteManagersNames((p) => (p.includes(n) ? p : [...p, n]))
    setSiteManagerInput('')
  }

  function removeWorker(n: string) {
    setWorkersNames((p) => p.filter((x) => x !== n))
  }

  function removeSiteManager(n: string) {
    setSiteManagersNames((p) => p.filter((x) => x !== n))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!projectId) throw new Error('Missing projectId (route param is empty)')
      if (!logDate) throw new Error('Please select a date')
      if (!title.trim()) throw new Error('Please enter a title')

      const { data, error: authError } = await supabase.auth.getUser()
      if (authError) throw new Error(authError.message)
      const user = data?.user
      if (!user) throw new Error('Not logged in')

      // ✅ biztosítjuk, hogy mindig string[] menjen a Supabase text[] mezőkbe
      const w = toTextArray(workersNames)
      const sm = toTextArray(siteManagersNames)

      const payload = {
        project_id: projectId,
        user_id: user.id,
        log_date: logDate,
        description: title.trim(),
        work_description: workDescription.trim() || null,

        workers_count: w.length,
        site_managers_count: sm.length,

        workers_names: w, // text[]
        site_managers_names: sm, // text[]
      }

      // ✅ biztos insert + visszakapjuk az id-t
      const { data: inserted, error: insertError } = await supabase
        .from('daily_logs')
        .insert(payload)
        .select('id')
        .single()

      if (insertError) throw insertError
      if (!inserted?.id) throw new Error('Insert failed: no id returned')

      router.push(`/projects/${projectId}/logs/${inserted.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err?.message ?? 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: 52, fontWeight: 900, margin: '0 0 16px 0' }}>New Daily Log</h1>

      <div style={{ marginBottom: 12, color: '#666' }}>
        <b>projectId from route:</b> {projectId || '(empty)'}
      </div>

      <div>
        <label style={{ display: 'block', fontWeight: 800, marginBottom: 6 }}>Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: '100%', padding: 12, fontSize: 16, border: '1px solid #999' }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ display: 'block', fontWeight: 800, marginBottom: 6 }}>Date</label>
        <input
          type="date"
          value={logDate}
          onChange={(e) => setLogDate(e.target.value)}
          style={{ width: '100%', padding: 12, fontSize: 16, border: '1px solid #999' }}
        />
      </div>

      <div style={{ marginTop: 18, border: '1px solid #ccc', padding: 12 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Crew names</h2>

        <div style={{ marginTop: 12, border: '1px solid #ddd', padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Workers ({workersNames.length})</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={workerInput}
              onChange={(e) => setWorkerInput(e.target.value)}
              placeholder="Add a name..."
              style={{ flex: 1, padding: 12, fontSize: 16, border: '1px solid #999' }}
            />
            <button type="button" onClick={addWorker} style={{ border: '1px solid #000', padding: '10px 14px' }}>
              Add
            </button>
          </div>

          {workersNames.map((n) => (
            <div key={n} style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
              <span>{n}</span>
              <button
                type="button"
                onClick={() => removeWorker(n)}
                style={{ border: '1px solid #000', padding: '2px 8px' }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, border: '1px solid #ddd', padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Site Managers ({siteManagersNames.length})</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={siteManagerInput}
              onChange={(e) => setSiteManagerInput(e.target.value)}
              placeholder="Add a name..."
              style={{ flex: 1, padding: 12, fontSize: 16, border: '1px solid #999' }}
            />
            <button type="button" onClick={addSiteManager} style={{ border: '1px solid #000', padding: '10px 14px' }}>
              Add
            </button>
          </div>

          {siteManagersNames.map((n) => (
            <div key={n} style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
              <span>{n}</span>
              <button
                type="button"
                onClick={() => removeSiteManager(n)}
                style={{ border: '1px solid #000', padding: '2px 8px' }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <label style={{ display: 'block', fontWeight: 800, marginBottom: 6 }}>Work description</label>
        <textarea
          value={workDescription}
          onChange={(e) => setWorkDescription(e.target.value)}
          rows={6}
          style={{ width: '100%', padding: 12, fontSize: 16, border: '1px solid #999' }}
        />
      </div>

      <button type="submit" disabled={loading} style={{ marginTop: 14, border: '1px solid #000', padding: '10px 14px' }}>
        {loading ? 'Saving...' : 'Create Log'}
      </button>

      {error && <p style={{ color: 'crimson', marginTop: 10 }}>{error}</p>}
    </form>
  )
}
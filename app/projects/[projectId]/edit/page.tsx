'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

const LOGO_BUCKET = 'project-logos'

export default function ProjectEditPage() {
  const params = useParams()
  const router = useRouter()

  const projectId = useMemo(() => {
    const raw = (params as any)?.projectId
    return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
  }, [params])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [form, setForm] = useState({
    name: '',
    location: '',
    client: '',
    logo_url: '',
  })

  const [uploading, setUploading] = useState(false)

  // LOAD PROJECT
  useEffect(() => {
    async function load() {
      if (!projectId) return

      const { data, error } = await supabase
        .from('projects')
        .select('name, location, client, logo_url')
        .eq('id', projectId)
        .single()

      if (error) {
        setMsg(error.message)
      } else {
        setForm({
          name: data.name || '',
          location: data.location || '',
          client: data.client || '',
          logo_url: data.logo_url || '',
        })
      }

      setLoading(false)
    }

    load()
  }, [projectId])

  // LOGO UPLOAD
  async function uploadLogo(file: File) {
    setUploading(true)
    setMsg('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Nicht eingeloggt')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const path = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(path, file, {
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from(LOGO_BUCKET)
        .getPublicUrl(path)

      setForm((p) => ({
        ...p,
        logo_url: data.publicUrl,
      }))
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setUploading(false)
    }
  }

  // SAVE
  async function save() {
    setSaving(true)
    setMsg('')

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: form.name,
          location: form.location,
          client: form.client,
          logo_url: form.logo_url,
        })
        .eq('id', projectId)

      if (error) throw error

      router.push(`/projects`)
      router.refresh()
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page">Lädt…</div>

  return (
    <div className="page">
      <Link href="/projects">← Zurück</Link>

      <h1>Projekt bearbeiten</h1>

      {msg && <div className="error">{msg}</div>}

      <div className="card">
        <label>Projektname</label>
        <input
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        />

        <label>Standort</label>
        <input
          value={form.location}
          onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
        />

        <label>Client / Auftraggeber</label>
        <input
          value={form.client}
          onChange={(e) => setForm((p) => ({ ...p, client: e.target.value }))}
        />

        <label>Logo</label>

        {form.logo_url && (
          <img
            src={form.logo_url}
            style={{ width: 120, marginBottom: 10 }}
          />
        )}

        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              uploadLogo(e.target.files[0])
            }
          }}
        />

        <button onClick={save} disabled={saving || uploading}>
          {saving ? 'Speichern…' : 'Speichern'}
        </button>
      </div>

      <style jsx>{`
        .page { max-width: 600px; margin: auto; padding: 20px; }
        .card { display: flex; flex-direction: column; gap: 10px; }
        input { padding: 10px; border-radius: 8px; }
        button { padding: 12px; margin-top: 10px; }
        .error { color: red; margin-bottom: 10px; }
      `}</style>
    </div>
  )
}
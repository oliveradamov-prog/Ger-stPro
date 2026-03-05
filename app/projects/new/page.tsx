'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function NewProjectPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!name.trim()) {
        throw new Error('Please enter a project name')
      }

      // get logged user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw new Error(authError.message)
      if (!user) throw new Error('Not logged in')

      // ✅ COUNT existing projects
      const { count, error: countError } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (countError) throw new Error(countError.message)

      // ✅ FREE PLAN LIMIT = 3
      if ((count ?? 0) >= 3) {
        throw new Error(
          'Free plan limit reached. You can create up to 3 projects. Upgrade to create unlimited projects.'
        )
      }

      // ✅ CREATE PROJECT
      const { data: inserted, error: insertError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
        })
        .select('id')
        .single()

      if (insertError) throw new Error(insertError.message)
      if (!inserted?.id) throw new Error('Project created but no id returned')

      // go to project page
      router.push(`/projects/${inserted.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message ?? 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 40, fontWeight: 900 }}>New Project</h1>

      <div style={{ marginTop: 16 }}>
        <label>Project name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', padding: 10, border: '1px solid #999' }}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ width: '100%', padding: 10, border: '1px solid #999' }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{ marginTop: 16, padding: '10px 16px', border: '1px solid black' }}
      >
        {loading ? 'Creating...' : 'Create Project'}
      </button>

      {error && (
        <p style={{ color: 'crimson', marginTop: 12 }}>
          {error}
        </p>
      )}
    </form>
  )
}
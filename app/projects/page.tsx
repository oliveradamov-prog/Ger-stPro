'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Project = {
  id: string
  name: string
  location: string
  client: string
}

export default function ProjectsPage() {

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setProjects(data)
    }

    setLoading(false)
  }

  if (loading) return <p>Loading...</p>

  return (
    <div style={{ padding: 20 }}>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 20
      }}>
        <h1>Projects</h1>

        <Link href="/projects/new">
          New Project
        </Link>
      </div>


      {projects.map(project => (

        <div
          key={project.id}
          style={{
            border: '1px solid #ccc',
            padding: 12,
            marginBottom: 10
          }}
        >

          <h3>{project.name}</h3>

          <p>Location: {project.location}</p>

          <p>Client: {project.client}</p>

          <Link href={`/projects/${project.id}`}>
            View Daily Logs →
          </Link>

        </div>

      ))}

    </div>
  )
}
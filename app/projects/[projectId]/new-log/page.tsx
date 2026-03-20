'use client'

import NewLogForm from './NewLogForm'
import RequireAuth from '@/components/RequireAuth'

export default function Page() {
  return (
    <RequireAuth>
      <div style={{ padding: 16 }}>
        <NewLogForm />
      </div>
    </RequireAuth>
  )
}
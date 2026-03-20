'use client'

import RequireAuth from '@/components/RequireAuth'

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireAuth>{children}</RequireAuth>
}
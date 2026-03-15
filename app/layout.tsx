import React from 'react'
import './globals.css'
import type { Metadata } from 'next'
import TopBar from '@/components/TopBar'

export const metadata: Metadata = {
  title: 'GerüstPro',
  description: 'Baustellen Dokumentation für Gerüstbauer',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body>
        <TopBar />
        {children}
      </body>
    </html>
  )
}
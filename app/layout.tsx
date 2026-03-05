import './globals.css'
import type { Metadata } from 'next'
import TopBar from '@/components/TopBar'

export const metadata: Metadata = {
  title: 'Daily Log Builder',
  description: 'Daily logs app',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopBar />
        {children}
      </body>
    </html>
  )
}
import './globals.css'
import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'Daily Log Builder',
  description: 'Construction daily log documentation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  )
}
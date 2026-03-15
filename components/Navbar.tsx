'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HardHat, Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  if (pathname === '/login') return null

  const links = [
    { href: '/projects', label: 'Projects' },
    { href: '/upgrade', label: 'Upgrade' },
    { href: '/login', label: 'Login' },
  ]

  return (
    <nav
      style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(255,255,255,0.03)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: '0 auto',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 900,
            fontSize: 18,
            color: 'var(--text)',
            textDecoration: 'none',
          }}
        >
          <HardHat style={{ width: 22, height: 22, color: '#f97316' }} />
          Daily Log Builder
        </Link>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                padding: '8px 14px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--chip)',
                color: 'var(--text)',
                fontWeight: 800,
                fontSize: 14,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 40,
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}

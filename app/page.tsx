'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import SplashScreen from '../components/SplashScreen'

export default function HomePage() {

const [loading, setLoading] = useState(true)

useEffect(() => {
  const timer = setTimeout(() => {
    setLoading(false)
  }, 2500)

  return () => clearTimeout(timer)
}, [])

if (loading) return <SplashScreen />

return (
    <main
      style={{
        maxWidth: 980,
        margin: '0 auto',
        padding: '2rem 1rem',
        textAlign: 'center',
        color: 'var(--text)',
      }}
    >
      <div
        style={{
          border: '1px solid var(--border)',
          background: 'var(--chip)',
          borderRadius: 28,
          padding: '32px 20px',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 999,
            margin: '0 auto 18px',
            border: '1px solid rgba(255,255,255,.14)',
            background: 'rgba(255,255,255,.05)',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 10px 24px rgba(0,0,0,.16)',
          }}
        >
          <Image
            src="/logo.png"
            alt="GerüstPro Logo"
            fill
            style={{
              objectFit: 'cover',
              transform: 'scale(1.22)',
              transformOrigin: 'center center',
            }}
            priority
          />
        </div>

        <div
          style={{
            fontSize: 20,
            fontWeight: 900,
            color: 'var(--muted)',
            marginBottom: 10,
          }}
        >
          GerüstPro
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(34px, 7vw, 64px)',
            lineHeight: 1,
            fontWeight: 950,
            letterSpacing: '-0.04em',
            color: 'var(--text)',
          }}
        >
          Baustellen-Dokumentation für Gerüstbauer
        </h1>

        <p
          style={{
            maxWidth: 760,
            margin: '18px auto 0',
            fontSize: 'clamp(17px, 3.5vw, 23px)',
            lineHeight: 1.45,
            color: 'var(--muted)',
            fontWeight: 700,
          }}
        >
          Dokumentiere Projekte, Tagesberichte, Personal und Fotobeweise schnell,
          sauber und professionell.
        </p>

        <div
          style={{
            marginTop: 28,
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/projects"
            style={{
              minHeight: 48,
              padding: '12px 18px',
              borderRadius: 16,
              fontWeight: 900,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,.12)',
              color: 'var(--text)',
              border: '1px solid rgba(255,255,255,.22)',
            }}
          >
            Zu den Projekten
          </Link>

          <Link
            href="/login"
            style={{
              minHeight: 48,
              padding: '12px 18px',
              borderRadius: 16,
              fontWeight: 900,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--chip)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            Anmelden
          </Link>
        </div>
      </div>
    </main>
  )
}
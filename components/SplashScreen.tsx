'use client'

import Image from 'next/image'

export default function SplashScreen() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg,#0f172a,#1e293b)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: 220,
          height: 220,
          borderRadius: 999,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0,0,0,.4)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Image
          src="/logo.png"
          alt="GerüstPro"
          fill
          style={{
            objectFit: 'cover',
            transform: 'scale(1.1)',
            transformOrigin: 'center center',
          }}
          priority
        />
      </div>
    </div>
  )
}
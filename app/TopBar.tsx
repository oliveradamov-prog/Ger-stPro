'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function TopBar() {
  const router = useRouter()
  const pathname = usePathname()

  const [user, setUser] = useState<any>(null)
  const [menu, setMenu] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()

    const { data } = supabase.auth.onAuthStateChange(() => {
      load()
    })

    return () => data.subscription.unsubscribe()
  }, [])

  async function load() {
    const { data } = await supabase.auth.getUser()
    setUser(data.user)
    setLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{
      borderBottom: '1px solid #ddd',
      padding: '10px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: '#fff'
    }}>

      <Link href="/projects" style={{
        fontWeight: 900,
        textDecoration: 'none',
        color: '#000'
      }}>
        🏗 Daily Log Builder
      </Link>

      <button
        onClick={() => setMenu(!menu)}
        style={{
          border: '1px solid black',
          padding: '6px 10px',
          background: 'white'
        }}
      >
        ☰
      </button>

      {menu && (
        <div style={{
          position: 'absolute',
          right: 10,
          top: 60,
          border: '1px solid #ccc',
          padding: 12,
          background: 'white',
          width: 200
        }}>

          <div style={{marginBottom:10}}>
            {loading ? "Loading..." : user?.email}
          </div>

          <Link href="/projects">
            <div style={{marginBottom:10}}>Projects</div>
          </Link>

          {user ? (
            <button onClick={logout}>
              Log out
            </button>
          ) : (
            <Link href="/login">
              Log in
            </Link>
          )}

        </div>
      )}

    </div>
  )
}
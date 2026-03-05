'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMsg(error.message)
    } else {
      router.push('/projects')
    }
  }

  async function signUp() {
    setMsg('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) setMsg(error.message)
    else setMsg('Account created! Now sign in.')
  }

  return (
    <div style={{ maxWidth: 420, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Login</h1>

      <form onSubmit={signIn}>
        <label>Email</label>
        <input
          style={{ width: '100%', padding: 8, margin: '6px 0 12px' }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
        />

        <label>Password</label>
        <input
          style={{ width: '100%', padding: 8, margin: '6px 0 12px' }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="********"
        />

        <button style={{ width: '100%', padding: 10 }} type="submit">
          Sign In
        </button>
      </form>

      <button
        style={{ width: '100%', padding: 10, marginTop: 10 }}
        onClick={signUp}
      >
        Create account
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  )
}

'use client'

export default function TestPage() {
  return <div>CALLBACK OK</div>
}

  useEffect(() => {
    async function handleAuth() {
      const hash = window.location.hash
      const params = new URLSearchParams(hash.replace('#', ''))

      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      const type = params.get('type')

      if (access_token && refresh_token) {
        await supabase.auth.setSession({
          access_token,
          refresh_token,
        })
      }

      if (type === 'recovery') {
        router.replace('/reset-password')
        return
      }

      router.replace('/login')
    }

    handleAuth()
  }, [router])

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Bitte warten…
    </div>
  )
}
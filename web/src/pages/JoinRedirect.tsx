import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { isCloudConfigured } from '../lib/cloudMode'
import { supabase } from '../lib/supabase'

/** Share link: /join?code=XXXXXXXX → sign-in with hint, or Settings if already signed in */
export function JoinRedirect() {
  const [params] = useSearchParams()
  const code = (params.get('code') ?? '').trim().toUpperCase()
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    if (!isCloudConfigured() || !supabase) {
      setTarget('/')
      return
    }
    if (!code) {
      setTarget('/auth')
      return
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setTarget(`/settings?join=${encodeURIComponent(code)}`)
      } else {
        setTarget(`/auth?join=${encodeURIComponent(code)}`)
      }
    })
  }, [code])

  if (!target) {
    return (
      <div className="boot-screen">
        <p>Loading…</p>
      </div>
    )
  }

  return <Navigate to={target} replace />
}

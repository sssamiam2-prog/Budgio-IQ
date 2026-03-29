import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { AppVersionStamp } from '../components/AppVersionStamp'
import { isCloudConfigured } from '../lib/cloudMode'
import { supabase } from '../lib/supabase'

/** Share link: /join?code=XXXXXXXX → sign-in with hint, or Settings if already signed in */
export function JoinRedirect() {
  const [params] = useSearchParams()
  const code = (params.get('code') ?? '').trim().toUpperCase()

  if (!isCloudConfigured() || !supabase) {
    return <Navigate to="/" replace />
  }
  if (!code) {
    return <Navigate to="/auth" replace />
  }

  return <JoinRedirectAfterCode code={code} />
}

function JoinRedirectAfterCode({ code }: { code: string }) {
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase!.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      if (session) {
        setTarget(`/settings?join=${encodeURIComponent(code)}`)
      } else {
        setTarget(`/auth?join=${encodeURIComponent(code)}`)
      }
    })
    return () => {
      cancelled = true
    }
  }, [code])

  if (!target) {
    return (
      <div className="boot-screen">
        <p>Loading…</p>
        <AppVersionStamp variant="boot" />
      </div>
    )
  }

  return <Navigate to={target} replace />
}

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import * as cloud from '../lib/budgetCloud'
import { isCloudConfigured } from '../lib/cloudMode'
import { supabase } from '../lib/supabase'
import { useBudgetStore } from '../store/useBudgetStore'
import { AuthContext, type AuthCtx } from './authContext'

async function ensureHouseholdForUser(user: User) {
  const applyRemoteBundle = useBudgetStore.getState().applyRemoteBundle
  useBudgetStore.setState({ hydration: 'loading', syncError: null })
  try {
    let hid = await cloud.fetchProfileHouseholdId(user.id)
    if (!hid) {
      const { household } = await cloud.createHousehold('Our household')
      hid = household.id
      const defaultName =
        (typeof user.user_metadata?.display_name === 'string'
          ? user.user_metadata.display_name
          : null) ??
        user.email?.split('@')[0] ??
        null
      await cloud.upsertProfile(
        user.id,
        hid,
        defaultName,
        user.email ?? null,
      )
    } else {
      await cloud.syncProfileAccountEmail(user.id, user.email ?? null)
    }
    const bundle = await cloud.loadHouseholdBundle(hid)
    applyRemoteBundle(hid, bundle)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    useBudgetStore.setState({
      hydration: 'error',
      syncError: msg,
    })
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthCtx['session']>(null)
  const [ready, setReady] = useState(
    () => !isCloudConfigured() || !supabase,
  )

  const hydrate = useCallback(async (user: User | null) => {
    if (!user) {
      useBudgetStore.getState().clearCloudState()
      useBudgetStore.setState({ hydration: 'ready', syncError: null })
      return
    }
    await ensureHouseholdForUser(user)
  }, [])

  useEffect(() => {
    if (!isCloudConfigured() || !supabase) {
      return
    }

    let cancelled = false

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) return
      setSession(s)
      setReady(true)
      void hydrate(s?.user ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      void hydrate(s?.user ?? null)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [hydrate])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      ready,
    }),
    [session, ready],
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

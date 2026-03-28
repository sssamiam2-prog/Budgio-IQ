import { useEffect } from 'react'
import { isCloudConfigured } from '../lib/cloudMode'
import * as cloud from '../lib/budgetCloud'
import { supabase } from '../lib/supabase'
import { useBudgetStore } from '../store/useBudgetStore'

/** Refetch household when another member edits (requires Supabase Realtime). */
export function useHouseholdRealtime(householdId: string | null) {
  useEffect(() => {
    if (!isCloudConfigured() || !supabase || !householdId) return

    const refetch = async () => {
      try {
        const bundle = await cloud.loadHouseholdBundle(householdId)
        useBudgetStore.getState().applyRemoteBundle(householdId, bundle)
      } catch {
        /* ignore transient errors */
      }
    }

    const channel = supabase
      .channel(`household-${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'people',
          filter: `household_id=eq.${householdId}`,
        },
        refetch,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recurring_incomes',
          filter: `household_id=eq.${householdId}`,
        },
        refetch,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'one_time_incomes',
          filter: `household_id=eq.${householdId}`,
        },
        refetch,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `household_id=eq.${householdId}`,
        },
        refetch,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bills',
          filter: `household_id=eq.${householdId}`,
        },
        refetch,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'households',
          filter: `id=eq.${householdId}`,
        },
        refetch,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          window.dispatchEvent(new CustomEvent('budgio:household-members-changed'))
        },
      )
      .subscribe()

    return () => {
      if (supabase) void supabase.removeChannel(channel)
    }
  }, [householdId])
}

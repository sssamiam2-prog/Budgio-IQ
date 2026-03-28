import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isCloudConfigured } from '../lib/cloudMode'
import { useBudgetStore } from '../store/useBudgetStore'
import { useAuth } from './useAuth'

export function RequireAuth() {
  const { session, ready } = useAuth()
  const hydration = useBudgetStore((s) => s.hydration)
  const syncError = useBudgetStore((s) => s.syncError)
  const location = useLocation()

  if (!isCloudConfigured()) return <Outlet />

  if (!ready || hydration === 'loading') {
    return (
      <div className="boot-screen">
        <p>Loading Budgio IQ…</p>
      </div>
    )
  }

  if (hydration === 'error' && syncError) {
    return (
      <div className="boot-screen boot-screen--error">
        <p>Could not load your household.</p>
        <p className="muted small">{syncError}</p>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return <Outlet />
}

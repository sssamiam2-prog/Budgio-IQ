import { Outlet } from 'react-router-dom'
import { useHouseholdRealtime } from '../hooks/useHouseholdRealtime'
import { useBudgetStore } from '../store/useBudgetStore'
import { AppVersionStamp } from './AppVersionStamp'
import { BottomNav } from './BottomNav'
import { CosmicBackground } from './CosmicBackground'

export function AppShell() {
  const householdId = useBudgetStore((s) => s.householdId)
  useHouseholdRealtime(householdId)

  return (
    <div className="app-shell">
      <CosmicBackground />
      <div className="app-shell__content">
        <Outlet />
      </div>
      <AppVersionStamp variant="shell" />
      <BottomNav />
    </div>
  )
}

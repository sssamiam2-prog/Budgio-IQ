import { useMemo } from 'react'
import { paycheckEventsForWindow, suggestPaycheckForBill } from '../lib/paychecks'
import { useBudgetStore } from '../store/useBudgetStore'

type Props = { billDueIso: string }

export function BillPaycheckHint({ billDueIso }: Props) {
  const recurring = useBudgetStore((s) => s.recurringIncomes)
  const suggestion = useMemo(() => {
    const due = new Date(billDueIso + 'T12:00:00')
    const events = paycheckEventsForWindow(recurring, new Date(), 90)
    return suggestPaycheckForBill(due, events)
  }, [billDueIso, recurring])

  if (!suggestion) {
    return (
      <p className="hint hint--muted">
        Add a recurring paycheck to get a “which check pays this” suggestion.
      </p>
    )
  }

  return <p className="hint">{suggestion.reason}</p>
}

import { isAfter, isBefore, startOfMonth } from 'date-fns'
import { useMemo } from 'react'
import { useBudgetStore } from '../store/useBudgetStore'

export function useMonthTotals() {
  const expenses = useBudgetStore((s) => s.expenses)
  const bills = useBudgetStore((s) => s.bills)

  return useMemo(() => {
    const now = new Date()
    const start = startOfMonth(now)
    const expenseSum = expenses
      .filter((e) => !isBefore(new Date(e.date + 'T12:00:00'), start))
      .reduce((s, e) => s + e.amount, 0)
    const billSum = bills
      .filter((b) => {
        const d = new Date(b.dueDate + 'T12:00:00')
        return !isBefore(d, start) && !isAfter(d, now)
      })
      .reduce((s, b) => s + b.amount, 0)
    return { expenseSum, billSum, spentApprox: expenseSum + billSum }
  }, [expenses, bills])
}

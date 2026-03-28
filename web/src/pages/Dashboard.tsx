import { useMemo } from 'react'
import { formatMoney, formatShortDate } from '../lib/format'
import { listPaycheckDates, mergePaycheckTimeline } from '../lib/paychecks'
import { useBudgetStore } from '../store/useBudgetStore'
import { HeaderBar } from '../components/HeaderBar'
import { useMonthTotals } from '../hooks/useMonthTotals'

export function Dashboard() {
  const recurring = useBudgetStore((s) => s.recurringIncomes)
  const bills = useBudgetStore((s) => s.bills)
  const monthlyCap = useBudgetStore((s) => s.monthlyBudgetCap)
  const { expenseSum } = useMonthTotals()

  const nextPayLine = useMemo(() => {
    const from = new Date()
    const items = recurring.map((inc) => ({
      income: inc,
      dates: listPaycheckDates(inc, from, 1),
    }))
    const merged = mergePaycheckTimeline(items)
    const first = merged[0]
    if (!first) return null
    return `${first.label} ${formatMoney(first.amount)} · ${formatShortDate(first.date.toISOString().slice(0, 10))}`
  }, [recurring])

  const cap = monthlyCap ?? 0
  const pct = cap > 0 ? Math.min(100, (expenseSum / cap) * 100) : 0
  const remaining = Math.max(0, cap - expenseSum)

  const sortedBills = useMemo(() => {
    return [...bills].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )
  }, [bills])

  return (
    <div className="page">
      <HeaderBar showMenu />
      <div className="page__body">
        <section className="hero-card">
          <p className="hero-card__label">Available outlook</p>
          <p className="hero-card__balance">{formatMoney(remaining)}</p>
          <p className="hero-card__sub">
            {cap > 0
              ? `${formatMoney(expenseSum)} of ${formatMoney(cap)} spent this month`
              : 'Set a monthly spending cap in Settings'}
          </p>
          {cap > 0 ? (
            <div className="progress" aria-hidden>
              <div className="progress__fill" style={{ width: `${pct}%` }} />
            </div>
          ) : null}
        </section>

        <section className="section">
          <h2 className="section__title">Next income</h2>
          {nextPayLine ? (
            <div className="list-tile list-tile--light">
              <span className="list-tile__main">{nextPayLine}</span>
              <span className="tag">Scheduled</span>
            </div>
          ) : (
            <p className="muted">Add a recurring paycheck under Income.</p>
          )}
        </section>

        <section className="section">
          <h2 className="section__title">Upcoming bills</h2>
          <div className="stack">
            {sortedBills.slice(0, 5).map((b) => (
              <div key={b.id} className="list-tile list-tile--glass">
                <div>
                  <div className="list-tile__main">{b.label}</div>
                  <div className="list-tile__sub">
                    Due {formatShortDate(b.dueDate)}
                  </div>
                </div>
                <div className="list-tile__amount">{formatMoney(b.amount)}</div>
              </div>
            ))}
            {!sortedBills.length ? (
              <p className="muted">No bills yet — add them under Expenses.</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}

import { addDays, addMonths, addWeeks, isBefore, max, min, startOfDay } from 'date-fns'
import type { PayFrequency, RecurringIncome } from '../types/models'

function advance(date: Date, frequency: PayFrequency): Date {
  const d = startOfDay(date)
  switch (frequency) {
    case 'weekly':
      return addWeeks(d, 1)
    case 'biweekly':
      return addWeeks(d, 2)
    case 'semimonthly': {
      const day = d.getDate()
      if (day <= 14) return addDays(d, 15 - day)
      const firstNext = addMonths(
        startOfDay(new Date(d.getFullYear(), d.getMonth(), 1)),
        1,
      )
      return addDays(firstNext, 13)
    }
    case 'monthly':
      return addMonths(d, 1)
  }
}

/** Move `cursor` forward until it is >= `notBefore` */
function advanceToOnOrAfter(
  cursor: Date,
  frequency: PayFrequency,
  notBefore: Date,
): Date {
  let c = startOfDay(cursor)
  const limit = startOfDay(notBefore)
  let guard = 0
  while (isBefore(c, limit) && guard < 1000) {
    guard++
    c = advance(c, frequency)
  }
  return c
}

/** Next `count` paycheck dates on or after `from` */
export function listPaycheckDates(
  income: RecurringIncome,
  from: Date,
  count: number,
): Date[] {
  const start = startOfDay(from)
  let cursor = startOfDay(new Date(income.anchorDate))
  cursor = advanceToOnOrAfter(cursor, income.frequency, start)
  const out: Date[] = []
  let guard = 0
  while (out.length < count && guard < 200) {
    guard++
    out.push(cursor)
    cursor = advance(cursor, income.frequency)
  }
  return out
}

export function allUpcomingPaychecks(
  incomes: RecurringIncome[],
  from: Date,
  each: number,
): { income: RecurringIncome; dates: Date[] }[] {
  return incomes.map((income) => ({
    income,
    dates: listPaycheckDates(income, from, each),
  }))
}

export function mergePaycheckTimeline(
  items: { income: RecurringIncome; dates: Date[] }[],
): { date: Date; label: string; amount: number; id: string }[] {
  const flat: { date: Date; label: string; amount: number; id: string }[] = []
  for (const { income, dates } of items) {
    for (const dt of dates) {
      flat.push({
        date: dt,
        label: income.label,
        amount: income.amount,
        id: income.id,
      })
    }
  }
  flat.sort((a, b) => a.date.getTime() - b.date.getTime())
  return flat
}

export function paycheckEventsForWindow(
  incomes: RecurringIncome[],
  from: Date,
  horizonDays: number,
): { date: Date; label: string; incomeId: string }[] {
  const end = addDays(startOfDay(from), horizonDays)
  const events: { date: Date; label: string; incomeId: string }[] = []
  for (const inc of incomes) {
    const dates = listPaycheckDates(inc, from, 24)
    for (const dt of dates) {
      if (dt.getTime() > end.getTime()) break
      events.push({
        date: dt,
        label: inc.label,
        incomeId: inc.id,
      })
    }
  }
  events.sort((a, b) => a.date.getTime() - b.date.getTime())
  return events
}

export function suggestPaycheckForBill(
  billDue: Date,
  paycheckEvents: { date: Date; label: string; incomeId: string }[],
): { incomeId: string; date: Date; reason: string } | null {
  const due = startOfDay(billDue)
  const sorted = [...paycheckEvents].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  )
  const onOrBefore = sorted.filter(
    (e) => !isBefore(due, e.date),
  )
  if (onOrBefore.length) {
    const pick = onOrBefore[onOrBefore.length - 1]!
    return {
      incomeId: pick.incomeId,
      date: pick.date,
      reason: `Use the ${pick.label} on ${pick.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — latest deposit on or before your due date.`,
    }
  }
  const after = sorted.find((e) => isBefore(due, e.date))
  if (after) {
    return {
      incomeId: after.incomeId,
      date: after.date,
      reason: `No paycheck on or before this due date in the forecast. Earliest after is ${after.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — consider due date or pay early.`,
    }
  }
  return null
}

export function minMaxDates(dates: Date[]): { min: Date; max: Date } | null {
  if (!dates.length) return null
  return { min: min(dates), max: max(dates) }
}

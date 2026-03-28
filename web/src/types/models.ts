export type IncomeSourceCategory =
  | 'paycheck'
  | 'sale'
  | 'gift'
  | 'freelance'
  | 'refund'
  | 'other'

export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'

export interface Person {
  id: string
  name: string
}

export interface RecurringIncome {
  id: string
  label: string
  amount: number
  frequency: PayFrequency
  /** ISO date — schedule is computed from this anchor */
  anchorDate: string
  sourceCategory: IncomeSourceCategory
}

export interface OneTimeIncome {
  id: string
  label: string
  amount: number
  date: string
  sourceCategory: IncomeSourceCategory
  note?: string
  /** Who this income is for / attributed to */
  personIds: string[]
}

export interface Expense {
  id: string
  label: string
  amount: number
  date: string
  category: string
  personIds: string[]
}

export interface Bill {
  id: string
  label: string
  amount: number
  /** Next due date (ISO) */
  dueDate: string
  category: string
  personIds: string[]
}

export const INCOME_SOURCE_LABELS: Record<IncomeSourceCategory, string> = {
  paycheck: 'Paycheck',
  sale: 'Sale of an item',
  gift: 'Gift',
  freelance: 'Freelance / side income',
  refund: 'Refund',
  other: 'Other',
}

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Housing',
  'Bills & Utilities',
  'Groceries',
  'Transportation',
  'Healthcare',
  'Entertainment',
  'Savings',
  'Other',
] as const

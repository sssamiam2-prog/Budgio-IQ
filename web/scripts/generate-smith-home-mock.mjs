/**
 * Reads assets/Example Excel Data/Smith Home Bills.xlsx and writes
 * src/data/smithHomeMock.ts — re-run after updating the spreadsheet.
 *
 * Usage: node scripts/generate-smith-home-mock.mjs
 */
import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const wbPath = path.join(
  root,
  '..',
  'assets',
  'Example Excel Data',
  'Smith Home Bills.xlsx',
)

function excelSerialToDate(n) {
  if (n == null || n === '' || typeof n !== 'number') return null
  const utc = Math.round((n - 25569) * 86400 * 1000)
  const d = new Date(utc)
  return isNaN(d.getTime()) ? null : d
}

function nextFutureIso(d0) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (!d0) {
    const x = new Date(today)
    x.setDate(x.getDate() + 14)
    return x.toISOString().slice(0, 10)
  }
  let dom = d0.getDate()
  if (dom > 28) dom = 28
  let d = new Date(today.getFullYear(), today.getMonth(), dom)
  if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, dom)
  let guard = 0
  while (d < today && guard++ < 24) {
    d = new Date(d.getFullYear(), d.getMonth() + 1, dom)
  }
  return d.toISOString().slice(0, 10)
}

function personIdsForLabel(label) {
  const t = label.trim()
  if (/^\(S\/P\)/i.test(t) || /^\(L\/S\)/i.test(t)) {
    return '[SMITH_PERSON_L, SMITH_PERSON_S]'
  }
  if (/^\(L\)/i.test(t)) return '[SMITH_PERSON_L]'
  if (/^\(S\)/i.test(t)) return '[SMITH_PERSON_S]'
  return '[SMITH_PERSON_L, SMITH_PERSON_S]'
}

const wb = XLSX.readFile(wbPath)
const ws = wb.Sheets[wb.SheetNames[0]]
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true })
const header = data[2]
const numMonthBlocks = Math.floor((header.length - 2) / 4)

let lastCat = 'Other'
const billRows = []
for (let r = 3; r < data.length; r++) {
  const row = data[r]
  if (!row || !row[1]) continue
  const c0 = row[0]
  if (c0 != null && String(c0).trim()) lastCat = String(c0).trim()
  const label = row[1].toString().trim()
  if (!label || /instructions/i.test(label)) continue
  let lastAmount = null
  let lastDue = null
  for (let m = 0; m < numMonthBlocks; m++) {
    const base = 2 + m * 4
    const amt = row[base]
    const due = row[base + 1]
    if (amt != null && amt !== '' && typeof amt === 'number' && amt > 0) {
      lastAmount = amt
    }
    const d = excelSerialToDate(due)
    if (d) lastDue = d
  }
  if (lastAmount != null) {
    billRows.push({
      category: lastCat,
      label,
      amount: Math.round(lastAmount * 100) / 100,
      dueIso: nextFutureIso(lastDue),
    })
  }
}

const billId = (i) =>
  `b1111111-1111-4111-8111-${String(i).padStart(12, '0')}`

const billsTs = billRows
  .map(
    (b, i) => `    {
      id: '${billId(i)}',
      label: ${JSON.stringify(b.label)},
      amount: ${b.amount},
      dueDate: '${b.dueIso}',
      category: ${JSON.stringify(b.category)},
      personIds: ${personIdsForLabel(b.label)},
    }`,
  )
  .join(',\n')

const out = `/**
 * Mock household data derived from assets/Example Excel Data/Smith Home Bills.xlsx
 * Regenerate: node scripts/generate-smith-home-mock.mjs
 */
import type {
  Bill,
  Expense,
  OneTimeIncome,
  Person,
  RecurringIncome,
} from '../types/models'

/** Stable ids so local persistence and demo mode stay consistent */
export const SMITH_PERSON_L = 'a1111111-1111-4111-8111-111111111101'
export const SMITH_PERSON_S = 'a1111111-1111-4111-8111-111111111102'

export const SMITH_HOME_NAME = 'Smith Home'

export function smithHomePeople(): Person[] {
  return [
    { id: SMITH_PERSON_L, name: 'Lee' },
    { id: SMITH_PERSON_S, name: 'Sam' },
  ]
}

/** Typical recurring income — not from the Excel (bills-only sheet) */
export function smithHomeRecurringIncomes(): RecurringIncome[] {
  const anchor = new Date()
  anchor.setDate(anchor.getDate() - ((anchor.getDay() + 3) % 7))
  const iso = anchor.toISOString().slice(0, 10)
  const addDays = (d: string, n: number) => {
    const x = new Date(d + 'T12:00:00')
    x.setDate(x.getDate() + n)
    return x.toISOString().slice(0, 10)
  }
  return [
    {
      id: 'r1111111-1111-4111-8111-111111111101',
      label: 'Paycheck (Lee)',
      amount: 3400,
      frequency: 'biweekly',
      anchorDate: iso,
      sourceCategory: 'paycheck',
    },
    {
      id: 'r1111111-1111-4111-8111-111111111102',
      label: 'Paycheck (Sam)',
      amount: 3800,
      frequency: 'biweekly',
      anchorDate: addDays(iso, 7),
      sourceCategory: 'paycheck',
    },
  ]
}

export function smithHomeOneTimeIncomes(): OneTimeIncome[] {
  return [
    {
      id: 'o1111111-1111-4111-8111-111111111101',
      label: 'Tax refund',
      amount: 1200,
      date: new Date().toISOString().slice(0, 10),
      sourceCategory: 'refund',
      note: 'Federal',
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
  ]
}

export function smithHomeExpenses(): Expense[] {
  const today = new Date().toISOString().slice(0, 10)
  return [
    {
      id: 'e1111111-1111-4111-8111-111111111101',
      label: 'Groceries',
      amount: 185,
      date: today,
      category: 'Groceries',
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'e1111111-1111-4111-8111-111111111102',
      label: 'Gas',
      amount: 95,
      date: today,
      category: 'Transportation',
      personIds: [SMITH_PERSON_S],
    },
  ]
}

export function smithHomeBills(): Bill[] {
  return [
${billsTs}
  ]
}

/** Default local-only seed (no Supabase) */
export function smithHomeLocalDefaults() {
  return {
    householdName: SMITH_HOME_NAME,
    people: smithHomePeople(),
    recurringIncomes: smithHomeRecurringIncomes(),
    oneTimeIncomes: smithHomeOneTimeIncomes(),
    expenses: smithHomeExpenses(),
    bills: smithHomeBills(),
    monthlyBudgetCap: 7500,
    bankLinkEnabled: false,
  }
}
`

fs.mkdirSync(path.join(root, 'src', 'data'), { recursive: true })
const outPath = path.join(root, 'src', 'data', 'smithHomeMock.ts')
fs.writeFileSync(outPath, out, 'utf8')
console.log(`Wrote ${billRows.length} bills to ${outPath}`)

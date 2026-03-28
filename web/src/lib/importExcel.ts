import type { Bill } from '../types/models'

export interface ParsedBillRow {
  label: string
  amount: number
  dueDate: string
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

function scoreHeader(h: string): { name?: number; amount?: number; due?: number } {
  const n = norm(h)
  const out: { name?: number; amount?: number; due?: number } = {}
  if (/(name|bill|vendor|payee|description|company)/i.test(n)) out.name = 3
  if (/(amount|payment|cost|due\s*amount|total)/i.test(n)) out.amount = 3
  if (/(due|date|pay\s*by|deadline)/i.test(n)) out.due = 3
  return out
}

function parseDateCell(v: unknown, XLSX: typeof import('xlsx')): Date | null {
  if (v == null) return null
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v
  if (typeof v === 'number') {
    const parse = XLSX.SSF?.parse_date_code
    if (typeof parse === 'function') {
      const d = parse(v)
      if (d) return new Date(d.y, d.m - 1, d.d)
    }
  }
  if (typeof v === 'string') {
    const t = Date.parse(v)
    if (!Number.isNaN(t)) return new Date(t)
  }
  return null
}

function parseAmountCell(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const cleaned = v.replace(/[$,]/g, '')
    const n = parseFloat(cleaned)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export async function parseBillsFromWorkbook(buf: ArrayBuffer): Promise<ParsedBillRow[]> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const sheet = wb.Sheets[wb.SheetNames[0]!]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
  }) as unknown as (string | number | null)[][]
  if (!rows.length) return []

  const headerRow = rows[0] as unknown as string[]
  const hasHeader = headerRow?.some(
    (c) => typeof c === 'string' && /due|amount|bill|name/i.test(c),
  )
  let dataRows = rows
  let nameIdx = 0
  let amountIdx = 1
  let dueIdx = 2

  if (hasHeader && headerRow) {
    const scores = headerRow.map((cell, i) => ({
      i,
      s: scoreHeader(String(cell ?? '')),
    }))
    const bestName = scores.reduce(
      (a, b) => ((a.s.name ?? 0) >= (b.s.name ?? 0) ? a : b),
      scores[0]!,
    )
    const bestAmt = scores.reduce(
      (a, b) => ((a.s.amount ?? 0) >= (b.s.amount ?? 0) ? a : b),
      scores[0]!,
    )
    const bestDue = scores.reduce(
      (a, b) => ((a.s.due ?? 0) >= (b.s.due ?? 0) ? a : b),
      scores[0]!,
    )
    nameIdx = bestName.i
    amountIdx = bestAmt.i
    dueIdx = bestDue.i
    dataRows = rows.slice(1)
  }

  const out: ParsedBillRow[] = []
  for (const row of dataRows) {
    if (!row || !row.length) continue
    const label = String(row[nameIdx] ?? '').trim()
    const amount = parseAmountCell(row[amountIdx])
    const due = parseDateCell(row[dueIdx], XLSX)
    if (!label || amount == null || amount <= 0 || !due) continue
    out.push({
      label,
      amount,
      dueDate: due.toISOString().slice(0, 10),
    })
  }
  return out
}

export function parsedBillsToModels(
  rows: ParsedBillRow[],
  category: string,
): Omit<Bill, 'id'>[] {
  return rows.map((r) => ({
    label: r.label,
    amount: r.amount,
    dueDate: r.dueDate,
    category,
    personIds: [],
  }))
}

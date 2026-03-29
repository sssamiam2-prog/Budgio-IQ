import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Bill, Expense, OneTimeIncome, RecurringIncome } from '../types/models'

export interface InsightContext {
  recurringIncomes: RecurringIncome[]
  oneTimeIncomes: OneTimeIncome[]
  expenses: Expense[]
  bills: Bill[]
  monthlyBudgetCap?: number
}

const GEMINI_MODEL = 'gemini-2.5-flash'
const MAX_QUESTION_LEN = 2000

/** JSON snapshot sent to Gemini (expense row limit avoids huge prompts). */
export function buildBudgetPayload(
  ctx: InsightContext,
  expenseLimit = 40,
): Record<string, unknown> {
  return {
    recurringIncomes: ctx.recurringIncomes.map((i) => ({
      label: i.label,
      amount: i.amount,
      frequency: i.frequency,
    })),
    oneTimeIncomes: ctx.oneTimeIncomes.map((i) => ({
      label: i.label,
      amount: i.amount,
      date: i.date,
    })),
    expenses: ctx.expenses.slice(0, expenseLimit).map((e) => ({
      label: e.label,
      amount: e.amount,
      category: e.category,
      date: e.date,
    })),
    bills: ctx.bills.map((b) => ({
      label: b.label,
      amount: b.amount,
      dueDate: b.dueDate,
    })),
    monthlyBudgetCap: ctx.monthlyBudgetCap,
  }
}

function sumIncomeApprox(ctx: InsightContext): number {
  const recurring = ctx.recurringIncomes.reduce((s, i) => s + i.amount, 0)
  const oneTime = ctx.oneTimeIncomes.reduce((s, i) => s + i.amount, 0)
  return recurring * 2 + oneTime
}

/** Free, local tips — no API key */
export function localBudgetTips(ctx: InsightContext): string[] {
  const tips: string[] = []
  const expenseTotal = ctx.expenses.reduce((s, e) => s + e.amount, 0)
  const billTotal = ctx.bills.reduce((s, b) => s + b.amount, 0)
  const incomeApprox = sumIncomeApprox(ctx)

  if (ctx.recurringIncomes.length === 0 && ctx.oneTimeIncomes.length === 0) {
    tips.push('Add at least one income source so Budgio IQ can compare money in vs money out.')
  }
  if (incomeApprox > 0 && expenseTotal + billTotal > incomeApprox * 0.85) {
    tips.push('Planned bills and recent spending are using most of your income. Try trimming one subscription or shifting a bill to align with an earlier paycheck.')
  }
  if (ctx.bills.length > 6) {
    tips.push('You have several bills — consider grouping due dates or using one “bills” checking account so nothing slips through.')
  }
  const cats = new Map<string, number>()
  for (const e of ctx.expenses) {
    cats.set(e.category, (cats.get(e.category) ?? 0) + e.amount)
  }
  let top: string | null = null
  let topVal = 0
  for (const [k, v] of cats) {
    if (v > topVal) {
      topVal = v
      top = k
    }
  }
  if (top && expenseTotal > 0) {
    tips.push(`Largest spending area lately: ${top}. Small cuts there add up fastest.`)
  }
  if (ctx.monthlyBudgetCap && expenseTotal > ctx.monthlyBudgetCap) {
    tips.push(`You are above your monthly spending cap ($${ctx.monthlyBudgetCap.toFixed(0)}). Review discretionary categories first.`)
  }
  if (!tips.length) {
    tips.push('You are off to a good start. Keep logging income and expenses so trends stay accurate.')
  }
  return tips
}

export async function geminiBudgetTips(
  apiKey: string,
  ctx: InsightContext,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })
  const payload = buildBudgetPayload(ctx, 40)
  const prompt = `You are Budgio IQ, a friendly budgeting coach for couples and households. Given this JSON data, write 3–5 short, actionable bullet paragraphs (plain text, no markdown). Focus on cash flow, bill timing, and one realistic habit. Data:\n${JSON.stringify(payload)}`
  const res = await model.generateContent(prompt)
  const text = res.response.text()
  return text.trim()
}

/**
 * Answer a user question using only the supplied budget snapshot.
 * Uses more expense rows than the tips flow when available.
 */
export async function geminiBudgetQuestion(
  apiKey: string,
  question: string,
  ctx: InsightContext,
): Promise<string> {
  const q = question.trim()
  if (!q) {
    throw new Error('Enter a question first.')
  }
  if (q.length > MAX_QUESTION_LEN) {
    throw new Error(`Keep your question under ${MAX_QUESTION_LEN} characters.`)
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })
  const payload = buildBudgetPayload(ctx, 80)
  const prompt = `You are Budgio IQ, a budgeting assistant for a household. Answer the user's question using ONLY the budget JSON below. If the data does not contain enough information, say what is missing or what they could track. Be concise and practical. Plain text only, no markdown. Round dollar amounts sensibly.

User question: ${JSON.stringify(q)}

Household budget JSON:
${JSON.stringify(payload)}`
  const res = await model.generateContent(prompt)
  const text = res.response.text()
  return text.trim()
}

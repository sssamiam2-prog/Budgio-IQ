import type {
  Bill,
  Expense,
  IncomeSourceCategory,
  OneTimeIncome,
  PayFrequency,
  Person,
  RecurringIncome,
} from '../types/models'
import { supabase } from './supabase'

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomJoinCode(): string {
  return Array.from(
    { length: 8 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('')
}

export type HouseholdRow = {
  id: string
  name: string
  monthly_budget_cap: number | null
  bank_link_enabled: boolean
  join_code: string
}

export async function createHousehold(
  name: string,
): Promise<{ household: HouseholdRow; joinCode: string }> {
  const client = requireClient()
  for (let attempt = 0; attempt < 20; attempt++) {
    const joinCode = randomJoinCode()
    const { data, error } = await client
      .from('households')
      .insert({
        name,
        join_code: joinCode,
      })
      .select()
      .single()
    if (!error && data) {
      return { household: data as HouseholdRow, joinCode: data.join_code }
    }
    if (error && error.code !== '23505') throw error
  }
  throw new Error('Could not create household (join code collision)')
}

export type HouseholdMemberProfile = {
  id: string
  display_name: string | null
  account_email: string | null
}

export async function upsertProfile(
  userId: string,
  householdId: string,
  displayName?: string | null,
  accountEmail?: string | null,
): Promise<void> {
  const client = requireClient()
  const row: Record<string, unknown> = {
    id: userId,
    household_id: householdId,
    display_name: displayName ?? null,
    updated_at: new Date().toISOString(),
  }
  if (accountEmail !== undefined) {
    row.account_email = accountEmail
  }
  const { error } = await client.from('profiles').upsert(row, {
    onConflict: 'id',
  })
  if (error) throw error
}

export async function fetchHouseholdMembers(
  householdId: string,
): Promise<HouseholdMemberProfile[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('profiles')
    .select('id, display_name, account_email')
    .eq('household_id', householdId)
    .order('account_email', { ascending: true })
  if (error) throw error
  return (data ?? []) as HouseholdMemberProfile[]
}

export async function updateMyDisplayName(
  userId: string,
  displayName: string,
): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('profiles')
    .update({
      display_name: displayName.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
  if (error) throw error
}

export async function syncProfileAccountEmail(
  userId: string,
  email: string | null,
): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('profiles')
    .update({
      account_email: email,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
  if (error) throw error
}

export async function fetchProfileHouseholdId(
  userId: string,
): Promise<string | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('profiles')
    .select('household_id')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data?.household_id ?? null
}

export async function fetchHouseholdRow(
  householdId: string,
): Promise<HouseholdRow | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('households')
    .select('*')
    .eq('id', householdId)
    .maybeSingle()
  if (error) throw error
  return data as HouseholdRow | null
}

export async function loadHouseholdBundle(householdId: string): Promise<{
  householdName: string
  monthlyBudgetCap: number | null
  bankLinkEnabled: boolean
  joinCode: string
  people: Person[]
  recurringIncomes: RecurringIncome[]
  oneTimeIncomes: OneTimeIncome[]
  expenses: Expense[]
  bills: Bill[]
}> {
  const client = requireClient()
  const [h, p, r, o, e, b] = await Promise.all([
    client.from('households').select('*').eq('id', householdId).single(),
    client.from('people').select('*').eq('household_id', householdId),
    client.from('recurring_incomes').select('*').eq('household_id', householdId),
    client.from('one_time_incomes').select('*').eq('household_id', householdId),
    client.from('expenses').select('*').eq('household_id', householdId),
    client.from('bills').select('*').eq('household_id', householdId),
  ])
  if (h.error) throw h.error
  const hh = h.data as HouseholdRow
  const cap = hh.monthly_budget_cap
  return {
    householdName: hh.name,
    monthlyBudgetCap:
      cap == null ? null : typeof cap === 'number' ? cap : Number(cap),
    bankLinkEnabled: hh.bank_link_enabled,
    joinCode: hh.join_code,
    people: (p.data ?? []).map((row: { id: string; name: string }) => ({
      id: row.id,
      name: row.name,
    })),
    recurringIncomes: (r.data ?? []).map(
      (row: {
        id: string
        label: string
        amount: number
        frequency: string
        anchor_date: string
        source_category: string
      }) => ({
        id: row.id,
        label: row.label,
        amount: Number(row.amount),
        frequency: row.frequency as PayFrequency,
        anchorDate: row.anchor_date,
        sourceCategory: row.source_category as IncomeSourceCategory,
      }),
    ),
    oneTimeIncomes: (o.data ?? []).map(
      (row: {
        id: string
        label: string
        amount: number
        income_date: string
        source_category: string
        note: string | null
        person_ids: string[] | null
      }) => ({
        id: row.id,
        label: row.label,
        amount: Number(row.amount),
        date: row.income_date,
        sourceCategory: row.source_category as IncomeSourceCategory,
        note: row.note ?? undefined,
        personIds: (row.person_ids ?? []).map(String),
      }),
    ),
    expenses: (e.data ?? []).map(
      (row: {
        id: string
        label: string
        amount: number
        expense_date: string
        category: string
        person_ids: string[] | null
      }) => ({
        id: row.id,
        label: row.label,
        amount: Number(row.amount),
        date: row.expense_date,
        category: row.category,
        personIds: (row.person_ids ?? []).map(String),
      }),
    ),
    bills: (b.data ?? []).map(
      (row: {
        id: string
        label: string
        amount: number
        due_date: string
        category: string
        person_ids: string[] | null
      }) => ({
        id: row.id,
        label: row.label,
        amount: Number(row.amount),
        dueDate: row.due_date,
        category: row.category,
        personIds: (row.person_ids ?? []).map(String),
      }),
    ),
  }
}

export async function updateHouseholdMeta(
  householdId: string,
  patch: Partial<{
    name: string
    monthly_budget_cap: number | null
    bank_link_enabled: boolean
  }>,
): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('households')
    .update(patch)
    .eq('id', householdId)
  if (error) throw error
}

export async function insertPerson(
  householdId: string,
  row: Person,
): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('people').insert({
    id: row.id,
    household_id: householdId,
    name: row.name,
  })
  if (error) throw error
}

export async function updatePersonRow(
  householdId: string,
  id: string,
  name: string,
): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('people')
    .update({ name })
    .eq('id', id)
    .eq('household_id', householdId)
  if (error) throw error
}

export async function deletePersonRow(
  householdId: string,
  id: string,
): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('people')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId)
  if (error) throw error
}

export async function insertRecurring(
  householdId: string,
  row: RecurringIncome,
): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('recurring_incomes').insert({
    id: row.id,
    household_id: householdId,
    label: row.label,
    amount: row.amount,
    frequency: row.frequency,
    anchor_date: row.anchorDate,
    source_category: row.sourceCategory,
  })
  if (error) throw error
}

export async function updateRecurringRow(
  householdId: string,
  id: string,
  patch: Partial<RecurringIncome>,
): Promise<void> {
  const client = requireClient()
  const payload: Record<string, unknown> = {}
  if (patch.label !== undefined) payload.label = patch.label
  if (patch.amount !== undefined) payload.amount = patch.amount
  if (patch.frequency !== undefined) payload.frequency = patch.frequency
  if (patch.anchorDate !== undefined) payload.anchor_date = patch.anchorDate
  if (patch.sourceCategory !== undefined)
    payload.source_category = patch.sourceCategory
  const { error } = await client
    .from('recurring_incomes')
    .update(payload)
    .eq('id', id)
    .eq('household_id', householdId)
  if (error) throw error
}

export async function deleteRecurringRow(
  householdId: string,
  id: string,
): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('recurring_incomes')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId)
  if (error) throw error
}

export async function insertOneTime(
  householdId: string,
  row: OneTimeIncome,
): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('one_time_incomes').insert({
    id: row.id,
    household_id: householdId,
    label: row.label,
    amount: row.amount,
    income_date: row.date,
    source_category: row.sourceCategory,
    note: row.note ?? null,
    person_ids: row.personIds,
  })
  if (error) throw error
}

export async function updateOneTimeRow(
  householdId: string,
  id: string,
  patch: Partial<OneTimeIncome>,
): Promise<void> {
  const client = requireClient()
  const payload: Record<string, unknown> = {}
  if (patch.label !== undefined) payload.label = patch.label
  if (patch.amount !== undefined) payload.amount = patch.amount
  if (patch.date !== undefined) payload.income_date = patch.date
  if (patch.sourceCategory !== undefined)
    payload.source_category = patch.sourceCategory
  if (patch.note !== undefined) payload.note = patch.note
  if (patch.personIds !== undefined) payload.person_ids = patch.personIds
  const { error } = await client
    .from('one_time_incomes')
    .update(payload)
    .eq('id', id)
    .eq('household_id', householdId)
  if (error) throw error
}

export async function deleteOneTimeRow(
  householdId: string,
  id: string,
): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('one_time_incomes')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId)
  if (error) throw error
}

export async function insertExpense(
  householdId: string,
  row: Expense,
): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('expenses').insert({
    id: row.id,
    household_id: householdId,
    label: row.label,
    amount: row.amount,
    expense_date: row.date,
    category: row.category,
    person_ids: row.personIds,
  })
  if (error) throw error
}

export async function updateExpenseRow(
  householdId: string,
  id: string,
  patch: Partial<Expense>,
): Promise<void> {
  const client = requireClient()
  const payload: Record<string, unknown> = {}
  if (patch.label !== undefined) payload.label = patch.label
  if (patch.amount !== undefined) payload.amount = patch.amount
  if (patch.date !== undefined) payload.expense_date = patch.date
  if (patch.category !== undefined) payload.category = patch.category
  if (patch.personIds !== undefined) payload.person_ids = patch.personIds
  const { error } = await client
    .from('expenses')
    .update(payload)
    .eq('id', id)
    .eq('household_id', householdId)
  if (error) throw error
}

export async function deleteExpenseRow(
  householdId: string,
  id: string,
): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId)
  if (error) throw error
}

export async function insertBill(
  householdId: string,
  row: Bill,
): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('bills').insert({
    id: row.id,
    household_id: householdId,
    label: row.label,
    amount: row.amount,
    due_date: row.dueDate,
    category: row.category,
    person_ids: row.personIds,
  })
  if (error) throw error
}

export async function insertBills(
  householdId: string,
  rows: Bill[],
): Promise<void> {
  for (const row of rows) {
    await insertBill(householdId, row)
  }
}

export async function updateBillRow(
  householdId: string,
  id: string,
  patch: Partial<Bill>,
): Promise<void> {
  const client = requireClient()
  const payload: Record<string, unknown> = {}
  if (patch.label !== undefined) payload.label = patch.label
  if (patch.amount !== undefined) payload.amount = patch.amount
  if (patch.dueDate !== undefined) payload.due_date = patch.dueDate
  if (patch.category !== undefined) payload.category = patch.category
  if (patch.personIds !== undefined) payload.person_ids = patch.personIds
  const { error } = await client
    .from('bills')
    .update(payload)
    .eq('id', id)
    .eq('household_id', householdId)
  if (error) throw error
}

export async function deleteBillRow(
  householdId: string,
  id: string,
): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('bills')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId)
  if (error) throw error
}

export async function joinHouseholdByCode(code: string): Promise<string> {
  const client = requireClient()
  const { data, error } = await client.rpc('join_household', {
    p_code: code.trim(),
  })
  if (error) throw error
  return data as string
}

export async function clearHouseholdData(householdId: string): Promise<void> {
  const client = requireClient()
  const tables = [
    'bills',
    'expenses',
    'one_time_incomes',
    'recurring_incomes',
    'people',
  ] as const
  for (const t of tables) {
    const { error } = await client
      .from(t)
      .delete()
      .eq('household_id', householdId)
    if (error) throw error
  }
}

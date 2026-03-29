import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { smithHomeLocalDefaults } from '../data/smithHomeMock'
import * as cloud from '../lib/budgetCloud'
import { isCloudConfigured } from '../lib/cloudMode'
import type {
  Bill,
  Expense,
  OneTimeIncome,
  Person,
  RecurringIncome,
} from '../types/models'

function uid(): string {
  return crypto.randomUUID()
}

export type Hydration = 'idle' | 'loading' | 'ready' | 'error'

export interface BudgetState {
  householdId: string | null
  joinCode: string | null
  hydration: Hydration
  syncError: string | null

  householdName: string
  people: Person[]
  recurringIncomes: RecurringIncome[]
  oneTimeIncomes: OneTimeIncome[]
  expenses: Expense[]
  bills: Bill[]
  monthlyBudgetCap: number | null
  bankLinkEnabled: boolean
  /** Cloud: Gemini key for Insights, stored on household row (shared with members). Local-only: always null. */
  geminiApiKey: string | null

  applyRemoteBundle: (
    householdId: string,
    bundle: Awaited<ReturnType<typeof cloud.loadHouseholdBundle>>,
  ) => void
  clearCloudState: () => void

  addPerson: (name: string) => Promise<void>
  updatePerson: (id: string, name: string) => Promise<void>
  removePerson: (id: string) => Promise<void>

  addRecurringIncome: (r: Omit<RecurringIncome, 'id'>) => Promise<void>
  updateRecurringIncome: (
    id: string,
    patch: Partial<RecurringIncome>,
  ) => Promise<void>
  removeRecurringIncome: (id: string) => Promise<void>

  addOneTimeIncome: (r: Omit<OneTimeIncome, 'id'>) => Promise<void>
  updateOneTimeIncome: (
    id: string,
    patch: Partial<OneTimeIncome>,
  ) => Promise<void>
  removeOneTimeIncome: (id: string) => Promise<void>

  addExpense: (e: Omit<Expense, 'id'>) => Promise<void>
  updateExpense: (id: string, patch: Partial<Expense>) => Promise<void>
  removeExpense: (id: string) => Promise<void>

  addBill: (b: Omit<Bill, 'id'>) => Promise<void>
  addBills: (items: Omit<Bill, 'id'>[]) => Promise<void>
  updateBill: (id: string, patch: Partial<Bill>) => Promise<void>
  removeBill: (id: string) => Promise<void>

  setMonthlyBudgetCap: (n: number | null) => Promise<void>
  setHouseholdName: (name: string) => Promise<void>
  setBankLinkEnabled: (v: boolean) => Promise<void>
  setGeminiApiKey: (k: string | null) => Promise<void>

  joinPartnerHousehold: (code: string) => Promise<void>
  loadDemo: () => Promise<void>
  resetAll: () => Promise<void>
}

function emptyData() {
  return {
    householdName: 'Our household',
    people: [] as Person[],
    recurringIncomes: [] as RecurringIncome[],
    oneTimeIncomes: [] as OneTimeIncome[],
    expenses: [] as Expense[],
    bills: [] as Bill[],
    monthlyBudgetCap: null as number | null,
    bankLinkEnabled: false,
    geminiApiKey: null as string | null,
  }
}

/** Local-only seed from assets/Example Excel Data/Smith Home Bills.xlsx (see smithHomeMock.ts) */
const localDefaults = smithHomeLocalDefaults()

function buildStore(
  set: (
    partial:
      | Partial<BudgetState>
      | ((s: BudgetState) => Partial<BudgetState>),
  ) => void,
  get: () => BudgetState,
): BudgetState {
  const hid = () => get().householdId

  return {
    householdId: null,
    joinCode: null,
    hydration: isCloudConfigured() ? 'loading' : 'ready',
    syncError: null,
    ...(isCloudConfigured() ? emptyData() : localDefaults),

    applyRemoteBundle: (householdId, bundle) => {
      set({
        householdId,
        joinCode: bundle.joinCode,
        householdName: bundle.householdName,
        people: bundle.people,
        recurringIncomes: bundle.recurringIncomes,
        oneTimeIncomes: bundle.oneTimeIncomes,
        expenses: bundle.expenses,
        bills: bundle.bills,
        monthlyBudgetCap: bundle.monthlyBudgetCap,
        bankLinkEnabled: bundle.bankLinkEnabled,
        geminiApiKey: bundle.geminiApiKey,
        hydration: 'ready',
        syncError: null,
      })
    },

    clearCloudState: () => {
      set({
        householdId: null,
        joinCode: null,
        ...emptyData(),
        geminiApiKey: null,
        hydration: 'ready',
        syncError: null,
      })
    },

    addPerson: async (name) => {
      const p: Person = { id: uid(), name: name.trim() || 'Member' }
      set((s) => ({ people: [...s.people, p] }))
      const h = hid()
      if (isCloudConfigured() && h) await cloud.insertPerson(h, p)
    },

    updatePerson: async (id, name) => {
      set((s) => ({
        people: s.people.map((p) =>
          p.id === id ? { ...p, name: name.trim() || p.name } : p,
        ),
      }))
      const h = hid()
      if (isCloudConfigured() && h)
        await cloud.updatePersonRow(h, id, name.trim() || 'Member')
    },

    removePerson: async (id) => {
      const st = get()
      const h = st.householdId
      if (isCloudConfigured() && h) {
        for (const e of st.expenses) {
          if (e.personIds.includes(id)) {
            const personIds = e.personIds.filter((pid) => pid !== id)
            await cloud.updateExpenseRow(h, e.id, { personIds })
          }
        }
        for (const b of st.bills) {
          if (b.personIds.includes(id)) {
            const personIds = b.personIds.filter((pid) => pid !== id)
            await cloud.updateBillRow(h, b.id, { personIds })
          }
        }
        for (const i of st.oneTimeIncomes) {
          if (i.personIds.includes(id)) {
            const personIds = i.personIds.filter((pid) => pid !== id)
            await cloud.updateOneTimeRow(h, i.id, { personIds })
          }
        }
        await cloud.deletePersonRow(h, id)
      }
      set((s) => ({
        people: s.people.filter((p) => p.id !== id),
        expenses: s.expenses.map((e) => ({
          ...e,
          personIds: e.personIds.filter((pid) => pid !== id),
        })),
        bills: s.bills.map((b) => ({
          ...b,
          personIds: b.personIds.filter((pid) => pid !== id),
        })),
        oneTimeIncomes: s.oneTimeIncomes.map((i) => ({
          ...i,
          personIds: i.personIds.filter((pid) => pid !== id),
        })),
      }))
    },

    addRecurringIncome: async (r) => {
      const row: RecurringIncome = { ...r, id: uid() }
      set((s) => ({ recurringIncomes: [...s.recurringIncomes, row] }))
      const h = hid()
      if (isCloudConfigured() && h) await cloud.insertRecurring(h, row)
    },

    updateRecurringIncome: async (id, patch) => {
      set((s) => ({
        recurringIncomes: s.recurringIncomes.map((x) =>
          x.id === id ? { ...x, ...patch } : x,
        ),
      }))
      const h = hid()
      if (isCloudConfigured() && h) await cloud.updateRecurringRow(h, id, patch)
    },

    removeRecurringIncome: async (id) => {
      set((s) => ({
        recurringIncomes: s.recurringIncomes.filter((x) => x.id !== id),
      }))
      const h = hid()
      if (isCloudConfigured() && h) await cloud.deleteRecurringRow(h, id)
    },

    addOneTimeIncome: async (r) => {
      const row: OneTimeIncome = { ...r, id: uid() }
      set((s) => ({ oneTimeIncomes: [...s.oneTimeIncomes, row] }))
      const h = hid()
      if (isCloudConfigured() && h) await cloud.insertOneTime(h, row)
    },

    updateOneTimeIncome: async (id, patch) => {
      set((s) => ({
        oneTimeIncomes: s.oneTimeIncomes.map((x) =>
          x.id === id ? { ...x, ...patch } : x,
        ),
      }))
      const h = hid()
      if (isCloudConfigured() && h) await cloud.updateOneTimeRow(h, id, patch)
    },

    removeOneTimeIncome: async (id) => {
      set((s) => ({
        oneTimeIncomes: s.oneTimeIncomes.filter((x) => x.id !== id),
      }))
      const h = hid()
      if (isCloudConfigured() && h) await cloud.deleteOneTimeRow(h, id)
    },

    addExpense: async (e) => {
      const row: Expense = { ...e, id: uid() }
      set((s) => ({ expenses: [...s.expenses, row] }))
      const h = hid()
      if (isCloudConfigured() && h) await cloud.insertExpense(h, row)
    },

    updateExpense: async (id, patch) => {
      set((s) => ({
        expenses: s.expenses.map((x) =>
          x.id === id ? { ...x, ...patch } : x,
        ),
      }))
      const h = hid()
      if (isCloudConfigured() && h) await cloud.updateExpenseRow(h, id, patch)
    },

    removeExpense: async (id) => {
      set((s) => ({
        expenses: s.expenses.filter((x) => x.id !== id),
      }))
      const h = hid()
      if (isCloudConfigured() && h) await cloud.deleteExpenseRow(h, id)
    },

    addBill: async (b) => {
      const row: Bill = { ...b, id: uid() }
      set((s) => ({ bills: [...s.bills, row] }))
      const h = hid()
      if (isCloudConfigured() && h) await cloud.insertBill(h, row)
    },

    addBills: async (items) => {
      const rows: Bill[] = items.map((b) => ({ ...b, id: uid() }))
      set((s) => ({ bills: [...s.bills, ...rows] }))
      const h = hid()
      if (isCloudConfigured() && h) await cloud.insertBills(h, rows)
    },

    updateBill: async (id, patch) => {
      set((s) => ({
        bills: s.bills.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      }))
      const h = hid()
      if (isCloudConfigured() && h) await cloud.updateBillRow(h, id, patch)
    },

    removeBill: async (id) => {
      set((s) => ({
        bills: s.bills.filter((x) => x.id !== id),
      }))
      const h = hid()
      if (isCloudConfigured() && h) await cloud.deleteBillRow(h, id)
    },

    setMonthlyBudgetCap: async (n) => {
      set({ monthlyBudgetCap: n })
      const h = hid()
      if (isCloudConfigured() && h)
        await cloud.updateHouseholdMeta(h, { monthly_budget_cap: n })
    },

    setHouseholdName: async (name) => {
      const n = name.trim() || 'Our household'
      set({ householdName: n })
      const h = hid()
      if (isCloudConfigured() && h) await cloud.updateHouseholdMeta(h, { name: n })
    },

    setBankLinkEnabled: async (v) => {
      set({ bankLinkEnabled: v })
      const h = hid()
      if (isCloudConfigured() && h)
        await cloud.updateHouseholdMeta(h, { bank_link_enabled: v })
    },

    setGeminiApiKey: async (k) => {
      const trimmed = k?.trim() || null
      set({ geminiApiKey: trimmed })
      const h = hid()
      if (isCloudConfigured() && h) {
        await cloud.updateHouseholdMeta(h, { gemini_api_key: trimmed })
      }
    },

    joinPartnerHousehold: async (code) => {
      const id = await cloud.joinHouseholdByCode(code)
      const bundle = await cloud.loadHouseholdBundle(id)
      get().applyRemoteBundle(id, bundle)
    },

    loadDemo: async () => {
      const demo = smithHomeLocalDefaults()

      const h = hid()
      if (isCloudConfigured() && h) {
        await cloud.clearHouseholdData(h)
        await cloud.updateHouseholdMeta(h, {
          name: demo.householdName,
          monthly_budget_cap: demo.monthlyBudgetCap,
        })
        for (const p of demo.people) await cloud.insertPerson(h, p)
        for (const r of demo.recurringIncomes)
          await cloud.insertRecurring(h, r)
        for (const o of demo.oneTimeIncomes) await cloud.insertOneTime(h, o)
        for (const e of demo.expenses) await cloud.insertExpense(h, e)
        for (const b of demo.bills) await cloud.insertBill(h, b)
        const bundle = await cloud.loadHouseholdBundle(h)
        get().applyRemoteBundle(h, bundle)
      } else {
        set({
          householdName: demo.householdName,
          people: demo.people,
          recurringIncomes: demo.recurringIncomes,
          oneTimeIncomes: demo.oneTimeIncomes,
          expenses: demo.expenses,
          bills: demo.bills,
          monthlyBudgetCap: demo.monthlyBudgetCap,
          bankLinkEnabled: demo.bankLinkEnabled,
        })
      }
    },

    resetAll: async () => {
      set({
        ...emptyData(),
        people: [],
        monthlyBudgetCap: null,
      })
      const h = hid()
      if (isCloudConfigured() && h) {
        await cloud.clearHouseholdData(h)
        await cloud.updateHouseholdMeta(h, {
          name: 'Our household',
          monthly_budget_cap: null,
          bank_link_enabled: false,
        })
      }
    },
  }
}

export const useBudgetStore = isCloudConfigured()
  ? create<BudgetState>()(buildStore)
  : create<BudgetState>()(
      persist(buildStore, {
        name: 'budgio-iq-budget',
        partialize: (s) => ({
          householdName: s.householdName,
          people: s.people,
          recurringIncomes: s.recurringIncomes,
          oneTimeIncomes: s.oneTimeIncomes,
          expenses: s.expenses,
          bills: s.bills,
          monthlyBudgetCap: s.monthlyBudgetCap,
          bankLinkEnabled: s.bankLinkEnabled,
        }),
        merge: (persisted, current) => ({
          ...current,
          ...(persisted as object),
          householdId: null,
          joinCode: null,
          geminiApiKey: null,
          hydration: 'ready' as Hydration,
          syncError: null,
        }),
      }),
    )

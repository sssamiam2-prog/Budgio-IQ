/**
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
    {
      id: 'b1111111-1111-4111-8111-000000000000',
      label: "(L) Tithing 1st paycheck",
      amount: 177,
      dueDate: '2026-04-04',
      category: "Household",
      personIds: [SMITH_PERSON_L],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000001',
      label: "(L) Tithing 2nd paycheck",
      amount: 202.94,
      dueDate: '2026-04-21',
      category: "Household",
      personIds: [SMITH_PERSON_L],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000002',
      label: "(S) Tithing 1st paycheck",
      amount: 212.29,
      dueDate: '2026-04-06',
      category: "Household",
      personIds: [SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000003',
      label: "(L) Etsy Tithing",
      amount: 16.52,
      dueDate: '2026-03-28',
      category: "Household",
      personIds: [SMITH_PERSON_L],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000004',
      label: "Cross Country Mortgage",
      amount: 1665.5,
      dueDate: '2026-03-28',
      category: "Household",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000005',
      label: "Rocky Mountain Power",
      amount: 183.35,
      dueDate: '2026-04-16',
      category: "Household",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000006',
      label: "Dominion",
      amount: 26.3,
      dueDate: '2026-04-26',
      category: "Household",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000007',
      label: "West Valley Utility",
      amount: 26.5,
      dueDate: '2026-03-28',
      category: "Household",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000008',
      label: "Granger Hunter",
      amount: 229.42,
      dueDate: '2026-04-08',
      category: "Household",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000009',
      label: "SSFCU    Truck",
      amount: 538.57,
      dueDate: '2026-03-28',
      category: "Household",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000010',
      label: "Netflix",
      amount: 15.49,
      dueDate: '2026-04-07',
      category: "Household",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000011',
      label: "(L) Amazon Prime",
      amount: 16.01,
      dueDate: '2026-03-28',
      category: "Household",
      personIds: [SMITH_PERSON_L],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000012',
      label: "Disney Plus / Hulu",
      amount: 9.09,
      dueDate: '2026-03-28',
      category: "Household",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000013',
      label: "(L) Verizon Benefit",
      amount: 177.09,
      dueDate: '2026-04-02',
      category: "Household",
      personIds: [SMITH_PERSON_L],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000014',
      label: "(L) Verizon Wireless",
      amount: 177.09,
      dueDate: '2026-04-06',
      category: "Household",
      personIds: [SMITH_PERSON_L],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000015',
      label: "BECU Line of credit",
      amount: 107.18,
      dueDate: '2026-04-14',
      category: "Household",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000016',
      label: "Progressive auto",
      amount: 466.82,
      dueDate: '2026-04-22',
      category: "Household",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000017',
      label: "MACU Visa",
      amount: 455,
      dueDate: '2026-03-28',
      category: "Household",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000018',
      label: "MACU Equity Gold",
      amount: 359.59,
      dueDate: '2026-03-28',
      category: "Household",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000019',
      label: "Scothern / trailor $$3500",
      amount: 500,
      dueDate: '2026-04-14',
      category: "Household",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000020',
      label: "Vet Smooch / Care Credit",
      amount: 115.03,
      dueDate: '2026-03-28',
      category: "Household",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000021',
      label: "(S) Intermountain Healthcare",
      amount: 205.01,
      dueDate: '2026-04-11',
      category: "Medical Bills",
      personIds: [SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000022',
      label: "Ring",
      amount: 3.99,
      dueDate: '2026-04-08',
      category: "Paid off or Canceled Accounts",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000023',
      label: "(S) Midland Credit Card",
      amount: 140,
      dueDate: '2026-04-24',
      category: "Paid off or Canceled Accounts",
      personIds: [SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000024',
      label: "Jefferson Capital /Verizon Chargeoff",
      amount: 164.62,
      dueDate: '2026-04-14',
      category: "Paid off or Canceled Accounts",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000025',
      label: "(S) Bonnpay.com - RMtnP",
      amount: 265.3,
      dueDate: '2026-04-19',
      category: "Paid off or Canceled Accounts",
      personIds: [SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000026',
      label: "Less Schwab Tire Center",
      amount: 50,
      dueDate: '2026-03-28',
      category: "Paid off or Canceled Accounts",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000027',
      label: "(S/P)OneMainFinancial-Truck",
      amount: 749.31,
      dueDate: '2026-04-17',
      category: "Paid off or Canceled Accounts",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000028',
      label: "Synchrony Bank - JC Penny",
      amount: 123.42,
      dueDate: '2026-04-13',
      category: "Paid off or Canceled Accounts",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000029',
      label: "(S) Primerica Life Insurance",
      amount: 167,
      dueDate: '2026-04-14',
      category: "Paid off or Canceled Accounts",
      personIds: [SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000030',
      label: "Synchrony Bank - CareCredit",
      amount: 1547.74,
      dueDate: '2026-04-02',
      category: "Paid off or Canceled Accounts",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000031',
      label: "Xfinity",
      amount: 16.08,
      dueDate: '2026-04-08',
      category: "Paid off or Canceled Accounts",
      personIds: [SMITH_PERSON_L, SMITH_PERSON_S],
    },
    {
      id: 'b1111111-1111-4111-8111-000000000032',
      label: "(L) Farmers Ins (Home & Auto)",
      amount: 140.99,
      dueDate: '2026-04-09',
      category: "Paid off or Canceled Accounts",
      personIds: [SMITH_PERSON_L],
    }
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

import { useMemo, useState } from 'react'
import { DEFAULT_EXPENSE_CATEGORIES } from '../types/models'
import { formatMoney, formatShortDate } from '../lib/format'
import { parsedBillsToModels, parseBillsFromWorkbook } from '../lib/importExcel'
import { useBudgetStore } from '../store/useBudgetStore'
import { HeaderBar } from '../components/HeaderBar'
import { Modal } from '../components/Modal'
import { BillPaycheckHint } from '../components/BillPaycheckHint'
import { useMonthTotals } from '../hooks/useMonthTotals'

export function ExpensesPage() {
  const people = useBudgetStore((s) => s.people)
  const expenses = useBudgetStore((s) => s.expenses)
  const bills = useBudgetStore((s) => s.bills)
  const monthlyCap = useBudgetStore((s) => s.monthlyBudgetCap)
  const addExpense = useBudgetStore((s) => s.addExpense)
  const addBill = useBudgetStore((s) => s.addBill)
  const addBills = useBudgetStore((s) => s.addBills)
  const updateBill = useBudgetStore((s) => s.updateBill)

  const { expenseSum } = useMonthTotals()
  const cap = monthlyCap ?? 0
  const remaining = Math.max(0, cap - expenseSum)
  const pct = cap > 0 ? Math.min(100, (expenseSum / cap) * 100) : 0

  const [openE, setOpenE] = useState(false)
  const [openB, setOpenB] = useState(false)
  const [editBill, setEditBill] = useState<string | null>(null)

  const [elabel, setElabel] = useState('')
  const [eamount, setEamount] = useState('')
  const [edate, setEdate] = useState(new Date().toISOString().slice(0, 10))
  const [ecat, setEcat] = useState<string>(DEFAULT_EXPENSE_CATEGORIES[0]!)
  const [epids, setEpids] = useState<string[]>([])

  const [blabel, setBlabel] = useState('')
  const [bamount, setBamount] = useState('')
  const [bdate, setBdate] = useState(new Date().toISOString().slice(0, 10))
  const [bcat, setBcat] = useState<string>('Bills & Utilities')
  const [bpids, setBpids] = useState<string[]>([])

  const [ebLabel, setEbLabel] = useState('')
  const [ebAmount, setEbAmount] = useState('')
  const [ebDue, setEbDue] = useState('')
  const [ebCat, setEbCat] = useState('')
  const [ebPids, setEbPids] = useState<string[]>([])

  const grouped = useMemo(() => {
    const m = new Map<string, typeof expenses>()
    for (const e of expenses) {
      const k = e.category || 'Other'
      m.set(k, [...(m.get(k) ?? []), e])
    }
    return m
  }, [expenses])

  function personNames(ids: string[]) {
    return ids
      .map((id) => people.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  async function submitExpense(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(eamount)
    if (!elabel.trim() || !Number.isFinite(amount) || amount <= 0) return
    await addExpense({
      label: elabel.trim(),
      amount,
      date: edate,
      category: ecat,
      personIds: epids,
    })
    setElabel('')
    setEamount('')
    setEpids([])
    setOpenE(false)
  }

  async function submitBill(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(bamount)
    if (!blabel.trim() || !Number.isFinite(amount) || amount <= 0) return
    await addBill({
      label: blabel.trim(),
      amount,
      dueDate: bdate,
      category: bcat,
      personIds: bpids,
    })
    setBlabel('')
    setBamount('')
    setBpids([])
    setOpenB(false)
  }

  function openEditBill(id: string) {
    const b = bills.find((x) => x.id === id)
    if (!b) return
    setEditBill(id)
    setEbLabel(b.label)
    setEbAmount(String(b.amount))
    setEbDue(b.dueDate)
    setEbCat(b.category)
    setEbPids([...b.personIds])
  }

  async function saveEditBill(e: React.FormEvent) {
    e.preventDefault()
    if (!editBill) return
    const amount = parseFloat(ebAmount)
    if (!ebLabel.trim() || !Number.isFinite(amount) || amount <= 0) return
    await updateBill(editBill, {
      label: ebLabel.trim(),
      amount,
      dueDate: ebDue,
      category: ebCat,
      personIds: ebPids,
    })
    setEditBill(null)
  }

  async function onExcel(file: File | null) {
    if (!file) return
    const buf = await file.arrayBuffer()
    const rows = await parseBillsFromWorkbook(buf)
    if (!rows.length) {
      alert('No rows found. Use columns for name, amount, and due date.')
      return
    }
    const models = parsedBillsToModels(rows, 'Bills & Utilities')
    await addBills(models)
  }

  function toggle(setter: (fn: (p: string[]) => string[]) => void, id: string) {
    setter((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  return (
    <div className="page">
      <HeaderBar title="Expenses" />
      <div className="page__body">
        <section className="hero-card hero-card--compact">
          <p className="hero-card__label">Remaining budget</p>
          <p className="hero-card__balance">{formatMoney(remaining)}</p>
          <p className="hero-card__sub">
            {cap > 0
              ? `${formatMoney(expenseSum)} of ${formatMoney(cap)} this month`
              : 'Set a monthly cap in Settings'}
          </p>
          {cap > 0 ? (
            <div className="progress" aria-hidden>
              <div className="progress__fill" style={{ width: `${pct}%` }} />
            </div>
          ) : null}
        </section>

        <section className="section">
          <h2 className="section__title">Bills</h2>
          <div className="stack">
            {bills.map((b) => (
              <div
                key={b.id}
                role="button"
                tabIndex={0}
                className="list-tile list-tile--glass list-tile--btn"
                onClick={() => openEditBill(b.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openEditBill(b.id)
                  }
                }}
              >
                <div className="text-left">
                  <div className="list-tile__main">{b.label}</div>
                  <div className="list-tile__sub">
                    Due {formatShortDate(b.dueDate)}
                    {b.personIds.length
                      ? ` · ${personNames(b.personIds)}`
                      : ''}
                  </div>
                  <BillPaycheckHint billDueIso={b.dueDate} />
                </div>
                <div className="list-tile__amount">{formatMoney(b.amount)}</div>
              </div>
            ))}
            {!bills.length ? (
              <p className="muted">No bills yet — add or import below.</p>
            ) : null}
          </div>
        </section>

        <section className="section">
          <h2 className="section__title">Spending by category</h2>
          <div className="stack">
            {Array.from(grouped.entries()).map(([cat, items]) => (
              <details key={cat} className="accordion" open>
                <summary>{cat}</summary>
                <div className="stack stack--tight">
                  {items.map((e) => (
                    <div key={e.id} className="list-tile list-tile--light">
                      <div>
                        <div className="list-tile__main">{e.label}</div>
                        <div className="list-tile__sub">
                          {formatShortDate(e.date)}
                          {e.personIds.length
                            ? ` · ${personNames(e.personIds)}`
                            : ''}
                        </div>
                      </div>
                      <div className="list-tile__amount">
                        {formatMoney(e.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
            {!expenses.length ? (
              <p className="muted">Expenses you add show up grouped here.</p>
            ) : null}
          </div>
        </section>

        <label className="upload-row">
          <span className="btn btn--ghost btn--block">Upload spreadsheet</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="sr-only"
            onChange={(e) => onExcel(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="fab-row">
          <button type="button" className="btn btn--ghost" onClick={() => setOpenB(true)}>
            + Add bill
          </button>
          <button type="button" className="btn btn--primary" onClick={() => setOpenE(true)}>
            + Add expense
          </button>
        </div>
      </div>

      <Modal title="Add expense" open={openE} onClose={() => setOpenE(false)}>
        <form className="form" onSubmit={submitExpense}>
          <label className="field">
            <span>Label</span>
            <input value={elabel} onChange={(e) => setElabel(e.target.value)} />
          </label>
          <label className="field">
            <span>Amount</span>
            <input
              inputMode="decimal"
              value={eamount}
              onChange={(e) => setEamount(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={edate}
              onChange={(e) => setEdate(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Category</span>
            <select value={ecat} onChange={(e) => setEcat(e.target.value)}>
              {DEFAULT_EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          {people.length ? (
            <div className="field">
              <span>For / who</span>
              <div className="chip-row">
                {people.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={
                      'chip' + (epids.includes(p.id) ? ' chip--on' : '')
                    }
                    onClick={() => toggle(setEpids, p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <button type="submit" className="btn btn--primary btn--block">
            Save
          </button>
        </form>
      </Modal>

      <Modal title="Add bill" open={openB} onClose={() => setOpenB(false)}>
        <form className="form" onSubmit={submitBill}>
          <label className="field">
            <span>Bill name</span>
            <input value={blabel} onChange={(e) => setBlabel(e.target.value)} />
          </label>
          <label className="field">
            <span>Amount</span>
            <input
              inputMode="decimal"
              value={bamount}
              onChange={(e) => setBamount(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Due date</span>
            <input
              type="date"
              value={bdate}
              onChange={(e) => setBdate(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Category</span>
            <select value={bcat} onChange={(e) => setBcat(e.target.value)}>
              {DEFAULT_EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          {people.length ? (
            <div className="field">
              <span>Assigned to</span>
              <div className="chip-row">
                {people.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={
                      'chip' + (bpids.includes(p.id) ? ' chip--on' : '')
                    }
                    onClick={() => toggle(setBpids, p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <button type="submit" className="btn btn--primary btn--block">
            Save
          </button>
        </form>
      </Modal>

      <Modal
        title="Edit bill"
        open={!!editBill}
        onClose={() => setEditBill(null)}
      >
        <form className="form" onSubmit={saveEditBill}>
          <p className="muted small">
            After you change amount or due date, suggestions refresh automatically.
          </p>
          <label className="field">
            <span>Bill name</span>
            <input value={ebLabel} onChange={(e) => setEbLabel(e.target.value)} />
          </label>
          <label className="field">
            <span>Amount</span>
            <input
              inputMode="decimal"
              value={ebAmount}
              onChange={(e) => setEbAmount(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Due date</span>
            <input
              type="date"
              value={ebDue}
              onChange={(e) => setEbDue(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Category</span>
            <input value={ebCat} onChange={(e) => setEbCat(e.target.value)} />
          </label>
          {people.length ? (
            <div className="field">
              <span>Assigned to</span>
              <div className="chip-row">
                {people.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={
                      'chip' + (ebPids.includes(p.id) ? ' chip--on' : '')
                    }
                    onClick={() => toggle(setEbPids, p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <button type="submit" className="btn btn--primary btn--block">
            Save changes
          </button>
        </form>
      </Modal>
    </div>
  )
}

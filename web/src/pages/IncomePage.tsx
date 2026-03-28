import { useState } from 'react'
import type { IncomeSourceCategory, PayFrequency } from '../types/models'
import { INCOME_SOURCE_LABELS } from '../types/models'
import { formatMoney, formatShortDate } from '../lib/format'
import { listPaycheckDates } from '../lib/paychecks'
import { useBudgetStore } from '../store/useBudgetStore'
import { HeaderBar } from '../components/HeaderBar'
import { Modal } from '../components/Modal'

const freqs: { v: PayFrequency; label: string }[] = [
  { v: 'weekly', label: 'Weekly' },
  { v: 'biweekly', label: 'Bi-weekly' },
  { v: 'semimonthly', label: 'Twice / month' },
  { v: 'monthly', label: 'Monthly' },
]

export function IncomePage() {
  const people = useBudgetStore((s) => s.people)
  const recurring = useBudgetStore((s) => s.recurringIncomes)
  const oneTime = useBudgetStore((s) => s.oneTimeIncomes)
  const addRecurring = useBudgetStore((s) => s.addRecurringIncome)
  const addOne = useBudgetStore((s) => s.addOneTimeIncome)

  const [openR, setOpenR] = useState(false)
  const [openO, setOpenO] = useState(false)

  const [rlabel, setRlabel] = useState('Paycheck')
  const [ramount, setRamount] = useState('1500')
  const [rfreq, setRfreq] = useState<PayFrequency>('biweekly')
  const [ranchor, setRanchor] = useState(new Date().toISOString().slice(0, 10))
  const [rsrc, setRsrc] = useState<IncomeSourceCategory>('paycheck')

  const [olabel, setOlabel] = useState('')
  const [oamount, setOamount] = useState('')
  const [odate, setOdate] = useState(new Date().toISOString().slice(0, 10))
  const [osrc, setOsrc] = useState<IncomeSourceCategory>('sale')
  const [onote, setOnote] = useState('')
  const [opids, setOpids] = useState<string[]>([])

  async function submitRecurring(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(ramount)
    if (!rlabel.trim() || !Number.isFinite(amount) || amount <= 0) return
    await addRecurring({
      label: rlabel.trim(),
      amount,
      frequency: rfreq,
      anchorDate: ranchor,
      sourceCategory: rsrc,
    })
    setOpenR(false)
  }

  async function submitOne(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(oamount)
    if (!olabel.trim() || !Number.isFinite(amount) || amount <= 0) return
    await addOne({
      label: olabel.trim(),
      amount,
      date: odate,
      sourceCategory: osrc,
      note: onote || undefined,
      personIds: opids,
    })
    setOlabel('')
    setOamount('')
    setOnote('')
    setOpids([])
    setOpenO(false)
  }

  function togglePerson(id: string) {
    setOpids((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  return (
    <div className="page">
      <HeaderBar title="Income" />
      <div className="page__body">
        <section className="section">
          <h2 className="section__title">Repeating income</h2>
          <div className="stack">
            {recurring.map((r) => {
              const next = listPaycheckDates(r, new Date(), 1)[0]
              return (
                <div key={r.id} className="list-tile list-tile--light">
                  <div>
                    <div className="list-tile__main">
                      {r.label} · {formatMoney(r.amount)}
                    </div>
                    <div className="list-tile__sub">
                      {freqs.find((f) => f.v === r.frequency)?.label ?? r.frequency}
                      {next
                        ? ` · Next ${formatShortDate(next.toISOString().slice(0, 10))}`
                        : ''}
                    </div>
                  </div>
                  <span className="tag">{INCOME_SOURCE_LABELS[r.sourceCategory]}</span>
                </div>
              )
            })}
            {!recurring.length ? (
              <p className="muted">No repeating income yet.</p>
            ) : null}
          </div>
        </section>

        <section className="section">
          <h2 className="section__title">Additional income</h2>
          <div className="stack">
            {oneTime.map((i) => (
              <div key={i.id} className="list-tile list-tile--glass">
                <div>
                  <div className="list-tile__main">{i.label}</div>
                  <div className="list-tile__sub">
                    {formatShortDate(i.date)}
                    {i.note ? ` · ${i.note}` : ''}
                  </div>
                </div>
                <div className="list-tile__amount">{formatMoney(i.amount)}</div>
              </div>
            ))}
            {!oneTime.length ? (
              <p className="muted">One-time deposits appear here.</p>
            ) : null}
          </div>
        </section>

        <div className="fab-row">
          <button type="button" className="btn btn--ghost" onClick={() => setOpenR(true)}>
            + Repeating income
          </button>
          <button type="button" className="btn btn--primary" onClick={() => setOpenO(true)}>
            + Add income
          </button>
        </div>
      </div>

      <Modal title="Repeating income" open={openR} onClose={() => setOpenR(false)}>
        <form className="form" onSubmit={submitRecurring}>
          <label className="field">
            <span>Label</span>
            <input value={rlabel} onChange={(e) => setRlabel(e.target.value)} />
          </label>
          <label className="field">
            <span>Amount</span>
            <input
              inputMode="decimal"
              value={ramount}
              onChange={(e) => setRamount(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Frequency</span>
            <select
              value={rfreq}
              onChange={(e) => setRfreq(e.target.value as PayFrequency)}
            >
              {freqs.map((f) => (
                <option key={f.v} value={f.v}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>First / anchor date</span>
            <input
              type="date"
              value={ranchor}
              onChange={(e) => setRanchor(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Source type</span>
            <select
              value={rsrc}
              onChange={(e) =>
                setRsrc(e.target.value as IncomeSourceCategory)
              }
            >
              {(Object.keys(INCOME_SOURCE_LABELS) as IncomeSourceCategory[]).map(
                (k) => (
                  <option key={k} value={k}>
                    {INCOME_SOURCE_LABELS[k]}
                  </option>
                ),
              )}
            </select>
          </label>
          <button type="submit" className="btn btn--primary btn--block">
            Save
          </button>
        </form>
      </Modal>

      <Modal title="One-time income" open={openO} onClose={() => setOpenO(false)}>
        <form className="form" onSubmit={submitOne}>
          <label className="field">
            <span>Label</span>
            <input value={olabel} onChange={(e) => setOlabel(e.target.value)} />
          </label>
          <label className="field">
            <span>Amount</span>
            <input
              inputMode="decimal"
              value={oamount}
              onChange={(e) => setOamount(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={odate}
              onChange={(e) => setOdate(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Source type</span>
            <select
              value={osrc}
              onChange={(e) =>
                setOsrc(e.target.value as IncomeSourceCategory)
              }
            >
              {(Object.keys(INCOME_SOURCE_LABELS) as IncomeSourceCategory[]).map(
                (k) => (
                  <option key={k} value={k}>
                    {INCOME_SOURCE_LABELS[k]}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="field">
            <span>Note (optional)</span>
            <input value={onote} onChange={(e) => setOnote(e.target.value)} />
          </label>
          {people.length ? (
            <div className="field">
              <span>For / attributed to</span>
              <div className="chip-row">
                {people.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={
                      'chip' + (opids.includes(p.id) ? ' chip--on' : '')
                    }
                    onClick={() => togglePerson(p.id)}
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
    </div>
  )
}

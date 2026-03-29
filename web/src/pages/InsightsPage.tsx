import { type CSSProperties, useMemo, useState } from 'react'
import { startOfMonth } from 'date-fns'
import { geminiBudgetTips, localBudgetTips } from '../lib/aiInsights'
import { formatMoney } from '../lib/format'
import { isCloudConfigured } from '../lib/cloudMode'
import { useBudgetStore } from '../store/useBudgetStore'
import { useLocalApiKeyStore } from '../store/useLocalApiKeyStore'
import { HeaderBar } from '../components/HeaderBar'

export function InsightsPage() {
  const recurring = useBudgetStore((s) => s.recurringIncomes)
  const oneTime = useBudgetStore((s) => s.oneTimeIncomes)
  const expenses = useBudgetStore((s) => s.expenses)
  const bills = useBudgetStore((s) => s.bills)
  const monthlyCap = useBudgetStore((s) => s.monthlyBudgetCap)
  const geminiApiKeyHousehold = useBudgetStore((s) => s.geminiApiKey)
  const localApiKey = useLocalApiKeyStore((s) => s.googleApiKey)
  const apiKey = isCloudConfigured() ? geminiApiKeyHousehold : localApiKey

  const [aiText, setAiText] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiErr, setAiErr] = useState<string | null>(null)

  const monthSpend = useMemo(() => {
    const start = startOfMonth(new Date())
    return expenses
      .filter((e) => new Date(e.date + 'T12:00:00') >= start)
      .reduce((s, e) => s + e.amount, 0)
  }, [expenses])

  const donutPct = monthlyCap && monthlyCap > 0
    ? Math.min(100, (monthSpend / monthlyCap) * 100)
    : 0

  const tips = localBudgetTips({
    recurringIncomes: recurring,
    oneTimeIncomes: oneTime,
    expenses,
    bills,
    monthlyBudgetCap: monthlyCap ?? undefined,
  })

  async function runGemini() {
    if (!apiKey?.trim()) {
      setAiErr(
        isCloudConfigured()
          ? 'Add a Google AI API key in Settings (saved for your household).'
          : 'Add a Google AI API key in Settings first.',
      )
      return
    }
    setAiLoading(true)
    setAiErr(null)
    try {
      const text = await geminiBudgetTips(apiKey.trim(), {
        recurringIncomes: recurring,
        oneTimeIncomes: oneTime,
        expenses,
        bills,
        monthlyBudgetCap: monthlyCap ?? undefined,
      })
      setAiText(text)
    } catch (e: unknown) {
      setAiErr(e instanceof Error ? e.message : 'Could not reach Gemini.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="page">
      <HeaderBar title="Insights" />
      <div className="page__body">
        <section className="section">
          <h2 className="section__title">This month</h2>
          <div className="donut-wrap">
            <div
              className="donut"
              style={
                {
                  '--pct': `${donutPct}`,
                } as CSSProperties
              }
              aria-label="Spending vs cap"
            >
              <div className="donut__inner">
                <span className="donut__value">{formatMoney(monthSpend)}</span>
                <span className="donut__sub">spent</span>
              </div>
            </div>
            {monthlyCap ? (
              <p className="muted center small">
                of {formatMoney(monthlyCap)} cap
              </p>
            ) : (
              <p className="muted center small">Set a monthly cap in Settings</p>
            )}
          </div>
        </section>

        <section className="section">
          <h2 className="section__title">Quick tips</h2>
          <div className="ai-bubble">
            {tips.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
          {apiKey?.trim() ? (
            <>
              <button
                type="button"
                className="btn btn--primary btn--block"
                onClick={runGemini}
                disabled={aiLoading}
              >
                {aiLoading ? 'Asking Budgio IQ…' : 'Deeper analysis (Gemini)'}
              </button>
              {aiErr ? <p className="error-text">{aiErr}</p> : null}
              {aiText ? (
                <div className="ai-bubble ai-bubble--accent">
                  {aiText.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="muted small">
              Optional: add a Google AI API key in Settings (
              {isCloudConfigured()
                ? 'shared with your household'
                : 'stored on this device'}
              ). Free tips work without it.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { HeaderBar } from '../components/HeaderBar'
import { NotificationsSection } from '../components/NotificationsSection'
import * as cloud from '../lib/budgetCloud'
import type { HouseholdMemberProfile } from '../lib/budgetCloud'
import { isCloudConfigured } from '../lib/cloudMode'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { useBudgetStore } from '../store/useBudgetStore'
import { useLocalApiKeyStore } from '../store/useLocalApiKeyStore'

export function SettingsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const householdName = useBudgetStore((s) => s.householdName)
  const householdId = useBudgetStore((s) => s.householdId)
  const joinCode = useBudgetStore((s) => s.joinCode)
  const people = useBudgetStore((s) => s.people)
  const monthlyCap = useBudgetStore((s) => s.monthlyBudgetCap)
  const bankLink = useBudgetStore((s) => s.bankLinkEnabled)

  const setHouseholdName = useBudgetStore((s) => s.setHouseholdName)
  const setMonthlyBudgetCap = useBudgetStore((s) => s.setMonthlyBudgetCap)
  const setBankLinkEnabled = useBudgetStore((s) => s.setBankLinkEnabled)
  const addPerson = useBudgetStore((s) => s.addPerson)
  const updatePerson = useBudgetStore((s) => s.updatePerson)
  const removePerson = useBudgetStore((s) => s.removePerson)
  const joinPartnerHousehold = useBudgetStore((s) => s.joinPartnerHousehold)
  const loadDemo = useBudgetStore((s) => s.loadDemo)
  const resetAll = useBudgetStore((s) => s.resetAll)

  const apiKey = useLocalApiKeyStore((s) => s.googleApiKey)
  const setGoogleApiKey = useLocalApiKeyStore((s) => s.setGoogleApiKey)

  const [name, setName] = useState(householdName)
  const [cap, setCap] = useState(monthlyCap != null ? String(monthlyCap) : '')
  const [key, setKey] = useState(apiKey ?? '')
  const [newPerson, setNewPerson] = useState('')
  const [partnerCode, setPartnerCode] = useState('')
  const [joinErr, setJoinErr] = useState<string | null>(null)
  const [members, setMembers] = useState<HouseholdMemberProfile[]>([])
  const [myDisplayName, setMyDisplayName] = useState('')

  const loadMembers = useCallback(async () => {
    if (!isCloudConfigured() || !householdId) return
    try {
      const rows = await cloud.fetchHouseholdMembers(householdId)
      setMembers(rows)
      const me = rows.find((m) => m.id === user?.id)
      if (me?.display_name != null) {
        setMyDisplayName(me.display_name)
      } else if (user?.email) {
        setMyDisplayName(user.email.split('@')[0] ?? '')
      }
    } catch {
      setMembers([])
    }
  }, [householdId, user?.id, user?.email])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  useEffect(() => {
    const onChange = () => void loadMembers()
    window.addEventListener('budgio:household-members-changed', onChange)
    return () => window.removeEventListener('budgio:household-members-changed', onChange)
  }, [loadMembers])

  useEffect(() => {
    const j = searchParams.get('join')
    if (j) {
      setPartnerCode(j.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 16))
    }
  }, [searchParams])

  function inviteInstructions(): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return [
      'Join Budgio IQ household',
      '',
      `1. Create an account: ${origin}/auth`,
      `2. Open this link (or enter the code in Settings → Join household): ${origin}/join?code=${joinCode ?? ''}`,
      '',
      `Join code: ${joinCode ?? '(loading)'}`,
    ].join('\n')
  }

  return (
    <div className="page">
      <HeaderBar title="Settings" />
      <div className="page__body">
        {isCloudConfigured() ? (
          <>
            <section className="section">
              <h2 className="section__title">Your account</h2>
              <p className="muted small">
                You are signed in as <strong>{user?.email ?? '—'}</strong>. Your data
                is scoped to <strong>one household</strong> — you never see other
                users’ budgets.
              </p>
              <label className="field">
                <span>Your display name (optional)</span>
                <input
                  value={myDisplayName}
                  onChange={(e) => setMyDisplayName(e.target.value)}
                  onBlur={() => {
                    if (!user?.id) return
                    void cloud.updateMyDisplayName(user.id, myDisplayName)
                    void loadMembers()
                  }}
                  placeholder="How you appear to household members"
                />
              </label>
            </section>

            <NotificationsSection userId={user?.id} userEmail={user?.email} />

            <section className="section">
              <h2 className="section__title">Who has access</h2>
              <p className="muted small">
                Accounts linked to this household. Budget rows are shared with
                everyone listed here.
              </p>
              <div className="stack">
                {members.length ? (
                  members.map((m) => (
                    <div key={m.id} className="list-tile list-tile--glass">
                      <div>
                        <div className="list-tile__main">
                          {m.display_name?.trim() ||
                            m.account_email?.split('@')[0] ||
                            'Member'}
                        </div>
                        <div className="list-tile__sub">
                          {m.account_email ?? '—'}
                        </div>
                      </div>
                      {m.id === user?.id ? (
                        <span className="tag">You</span>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="muted small">Loading members…</p>
                )}
              </div>
            </section>

            <section className="section">
              <h2 className="section__title">Invite someone</h2>
              <p className="muted small">
                Grant access by giving another person this code after they create
                their <strong>own</strong> account. They enter it below in “Join
                another household”.
              </p>
              {joinCode ? (
                <div className="join-code-box">
                  <span className="muted small">Household join code</span>
                  <div className="join-code-box__code">{joinCode}</div>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() =>
                      void navigator.clipboard.writeText(joinCode).catch(() => {})
                    }
                  >
                    Copy code
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(inviteInstructions())
                        .catch(() => {})
                    }
                  >
                    Copy instructions
                  </button>
                </div>
              ) : null}
              <p className="muted small">
                Share link:{' '}
                <code className="inline-code">
                  {typeof window !== 'undefined'
                    ? `${window.location.origin}/join?code=${joinCode ?? ''}`
                    : '/join?code=…'}
                </code>
              </p>
            </section>

            <section className="section">
              <h2 className="section__title">Join another household</h2>
              <p className="muted small">
                Leave your current household data and merge into someone else’s
                (only if they gave you a code). Your previous empty household may
                be removed.
              </p>
              <label className="field">
                <span>Partner’s code</span>
                <input
                  placeholder="8-character code"
                  value={partnerCode}
                  onChange={(e) => {
                    setPartnerCode(e.target.value.toUpperCase())
                    setJoinErr(null)
                  }}
                />
              </label>
              {joinErr ? <p className="error-text">{joinErr}</p> : null}
              <button
                type="button"
                className="btn btn--primary btn--block"
                onClick={() => {
                  void (async () => {
                    try {
                      await joinPartnerHousehold(partnerCode.trim())
                      setPartnerCode('')
                      setJoinErr(null)
                      await loadMembers()
                    } catch (e: unknown) {
                      setJoinErr(
                        e instanceof Error
                          ? e.message
                          : 'Could not join household',
                      )
                    }
                  })()
                }}
              >
                Join household
              </button>
            </section>
          </>
        ) : (
          <section className="section">
            <h2 className="section__title">Storage</h2>
            <p className="muted small">
              Running in local-only mode. Add{' '}
              <code className="inline-code">VITE_SUPABASE_URL</code> and{' '}
              <code className="inline-code">VITE_SUPABASE_ANON_KEY</code> to{' '}
              <code className="inline-code">.env</code> to enable shared cloud
              storage and sign-in.
            </p>
          </section>
        )}

        <section className="section">
          <h2 className="section__title">Household</h2>
          <label className="field">
            <span>Display name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => void setHouseholdName(name.trim() || 'Our household')}
            />
          </label>
        </section>

        <section className="section">
          <h2 className="section__title">People</h2>
          <p className="muted small">
            Used to tag expenses, bills, and one-time income (multiple allowed).
          </p>
          <div className="stack">
            {people.map((p) => (
              <div key={p.id} className="row-edit">
                <input
                  defaultValue={p.name}
                  onBlur={(e) => void updatePerson(p.id, e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => void removePerson(p.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="row-edit">
            <input
              placeholder="New person"
              value={newPerson}
              onChange={(e) => setNewPerson(e.target.value)}
            />
            <button
              type="button"
              className="btn btn--primary btn--small"
              onClick={() => {
                if (!newPerson.trim()) return
                void addPerson(newPerson.trim())
                setNewPerson('')
              }}
            >
              Add
            </button>
          </div>
        </section>

        <section className="section">
          <h2 className="section__title">Monthly spending cap</h2>
          <label className="field">
            <span>Cap (USD)</span>
            <input
              inputMode="decimal"
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              onBlur={() => {
                const n = parseFloat(cap)
                void setMonthlyBudgetCap(Number.isFinite(n) && n > 0 ? n : null)
              }}
            />
          </label>
        </section>

        <section className="section">
          <h2 className="section__title">Google AI (optional)</h2>
          <p className="muted small">
            Paste a Gemini API key from Google AI Studio for deeper insights. This
            key is kept only in this browser (not sent to Supabase).
          </p>
          <label className="field">
            <span>API key</span>
            <input
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onBlur={() => setGoogleApiKey(key.trim() || null)}
            />
          </label>
        </section>

        <section className="section">
          <h2 className="section__title">Bank accounts</h2>
          <p className="muted small">
            Linking banks is possible through providers such as Plaid or
            Mastercard open banking. That requires secure sign-in at your bank,
            compliance, and usually a server — we can add this in a future
            phase.
          </p>
          <label className="field field--row">
            <span>Interested in bank sync (preview toggle)</span>
            <input
              type="checkbox"
              checked={bankLink}
              onChange={(e) => void setBankLinkEnabled(e.target.checked)}
            />
          </label>
        </section>

        <section className="section">
          <h2 className="section__title">Data</h2>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() => void loadDemo()}
          >
            Load demo data
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--block danger"
            onClick={() => {
              if (
                confirm(
                  'Reset all budget data for this household? This cannot be undone.',
                )
              )
                void resetAll()
            }}
          >
            Reset all data
          </button>
        </section>

        {isCloudConfigured() && supabase ? (
          <section className="section">
            <h2 className="section__title">Sign out</h2>
            <button
              type="button"
              className="btn btn--ghost btn--block"
              onClick={() => {
                if (!supabase) return
                void supabase.auth.signOut().then(() => navigate('/auth'))
              }}
            >
              Sign out
            </button>
          </section>
        ) : null}
      </div>
    </div>
  )
}

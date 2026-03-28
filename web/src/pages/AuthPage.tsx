import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CosmicBackground } from '../components/CosmicBackground'

export function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const joinHint = searchParams.get('join')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resetMode, setResetMode] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (resetMode) {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
        })
        if (err) throw err
        setInfo(
          'If an account exists for that email, you will get a link to reset your password.',
        )
        setResetMode(false)
        setBusy(false)
        return
      }

      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        if (!data.session) {
          setInfo(
            'Check your email to confirm your account (if your project requires confirmation), then sign in here.',
          )
          setBusy(false)
          return
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (err) throw err
      }
      navigate('/', { replace: true })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <CosmicBackground />
      <div className="auth-page__panel">
        <img
          src="/branding/BudgioLogowithSlogan.png"
          alt="Budgio IQ"
          className="auth-page__logo"
        />
        {joinHint ? (
          <p className="muted small center" style={{ marginBottom: 12 }}>
            After you sign in, go to <strong>Settings</strong> and enter invite code{' '}
            <strong>{joinHint.toUpperCase()}</strong> under “Join household”.
          </p>
        ) : null}
        {!resetMode ? (
          <div className="auth-page__tabs">
            <button
              type="button"
              className={
                'auth-page__tab' + (mode === 'signin' ? ' auth-page__tab--on' : '')
              }
              onClick={() => {
                setMode('signin')
                setError(null)
                setInfo(null)
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={
                'auth-page__tab' + (mode === 'signup' ? ' auth-page__tab--on' : '')
              }
              onClick={() => {
                setMode('signup')
                setError(null)
                setInfo(null)
              }}
            >
              Create account
            </button>
          </div>
        ) : null}
        <form className="form" onSubmit={submit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          {!resetMode ? (
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                autoComplete={
                  mode === 'signup' ? 'new-password' : 'current-password'
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </label>
          ) : null}
          {error ? <p className="error-text">{error}</p> : null}
          {info ? <p className="muted small">{info}</p> : null}
          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={busy}
          >
            {busy
              ? 'Please wait…'
              : resetMode
                ? 'Send reset link'
                : mode === 'signup'
                  ? 'Sign up'
                  : 'Sign in'}
          </button>
        </form>
        {!resetMode && mode === 'signin' ? (
          <button
            type="button"
            className="btn btn--ghost btn--block"
            style={{ marginTop: 10 }}
            onClick={() => {
              setResetMode(true)
              setError(null)
              setInfo(null)
            }}
          >
            Forgot password?
          </button>
        ) : null}
        {resetMode ? (
          <button
            type="button"
            className="btn btn--ghost btn--block"
            style={{ marginTop: 10 }}
            onClick={() => {
              setResetMode(false)
              setError(null)
              setInfo(null)
            }}
          >
            Back to sign in
          </button>
        ) : null}
        <p className="muted small center">
          Each login only sees <strong>their household</strong> budget. Invite someone
          with a code from Settings after they create their own account.
        </p>
      </div>
    </div>
  )
}

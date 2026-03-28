import { useCallback, useEffect, useState } from 'react'
import {
  fetchNotificationPreferences,
  upsertNotificationPreferences,
  type NotificationPreferences,
} from '../lib/notificationPrefs'
import {
  isWebPushSupported,
  removePushSubscriptions,
  subscribeAndSavePush,
} from '../lib/webPush'
import { isCloudConfigured } from '../lib/cloudMode'
import { supabase } from '../lib/supabase'

type Props = {
  userId: string | undefined
  userEmail: string | undefined
}

export function NotificationsSection({ userId, userEmail }: Props) {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [pushStatus, setPushStatus] = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<string | null>(null)
  const [days, setDays] = useState('3')

  const load = useCallback(async () => {
    if (!userId || !isCloudConfigured()) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const p = await fetchNotificationPreferences(userId)
      setPrefs(p)
      setDays(String(p.reminder_days_before))
    } catch {
      setPrefs({
        email_reminders_enabled: true,
        push_reminders_enabled: true,
        reminder_days_before: 3,
      })
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  async function save(next: Partial<NotificationPreferences>) {
    if (!userId) return
    const merged = {
      email_reminders_enabled:
        next.email_reminders_enabled ?? prefs?.email_reminders_enabled ?? true,
      push_reminders_enabled:
        next.push_reminders_enabled ?? prefs?.push_reminders_enabled ?? true,
      reminder_days_before:
        next.reminder_days_before ?? prefs?.reminder_days_before ?? 3,
    }
    await upsertNotificationPreferences(userId, merged)
    setPrefs(merged)
  }

  async function onEnablePush() {
    if (!userId) return
    setPushStatus(null)
    const err = await subscribeAndSavePush(userId)
    setPushStatus(err ?? 'Browser notifications enabled.')
    if (!err) await save({ push_reminders_enabled: true })
  }

  async function onDisablePush() {
    if (!userId) return
    await removePushSubscriptions(userId)
    await save({ push_reminders_enabled: false })
    setPushStatus('Push disabled for this device (subscription removed).')
  }

  async function sendTest() {
    if (!supabase) return
    setTestStatus(null)
    try {
      const { data, error } = await supabase.functions.invoke(
        'send-test-reminder',
        { body: {} },
      )
      if (error) throw error
      setTestStatus(
        typeof data === 'object' && data && 'results' in data
          ? JSON.stringify((data as { results: unknown }).results)
          : 'Test sent.',
      )
    } catch (e: unknown) {
      setTestStatus(e instanceof Error ? e.message : 'Test failed')
    }
  }

  if (!isCloudConfigured() || !userId) {
    return null
  }

  if (loading || !prefs) {
    return (
      <section className="section">
        <h2 className="section__title">Reminders</h2>
        <p className="muted small">Loading…</p>
      </section>
    )
  }

  const vapidOk = Boolean(
    import.meta.env.VITE_VAPID_PUBLIC_KEY?.toString().trim(),
  )

  return (
    <section className="section">
      <h2 className="section__title">Reminders</h2>
      <p className="muted small">
        Get notified before bills are due. Email uses{' '}
        <strong>{userEmail ?? 'your account email'}</strong> (via Resend from the
        server). Push uses this browser after you enable notifications.
      </p>

      <label className="field field--row">
        <span>Email reminders</span>
        <input
          type="checkbox"
          checked={prefs.email_reminders_enabled}
          onChange={(e) => void save({ email_reminders_enabled: e.target.checked })}
        />
      </label>

      <label className="field field--row">
        <span>Push reminders (this device)</span>
        <input
          type="checkbox"
          checked={prefs.push_reminders_enabled}
          onChange={(e) => void save({ push_reminders_enabled: e.target.checked })}
        />
      </label>

      <label className="field">
        <span>Remind me this many days before a bill is due</span>
        <input
          type="number"
          min={0}
          max={30}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          onBlur={() => {
            const n = parseInt(days, 10)
            if (Number.isFinite(n) && n >= 0 && n <= 30) {
              void save({ reminder_days_before: n })
            } else {
              setDays(String(prefs.reminder_days_before))
            }
          }}
        />
      </label>

      {isWebPushSupported() ? (
        <div className="stack" style={{ marginTop: 12 }}>
          {!vapidOk ? (
            <p className="muted small">
              Add <code className="inline-code">VITE_VAPID_PUBLIC_KEY</code> to{' '}
              <code className="inline-code">.env</code> (see .env.example), then
              restart the dev server.
            </p>
          ) : (
            <>
              <div className="fab-row" style={{ justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => void onEnablePush()}
                >
                  Enable browser push
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void onDisablePush()}
                >
                  Remove this device
                </button>
              </div>
              {pushStatus ? (
                <p className="muted small">{pushStatus}</p>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <p className="muted small">
          Push notifications are not supported in this browser.
        </p>
      )}

      <p className="muted small" style={{ marginTop: 12 }}>
        After deploying Edge Functions, set secrets:{' '}
        <code className="inline-code">RESEND_API_KEY</code>,{' '}
        <code className="inline-code">VAPID_PUBLIC_KEY</code>,{' '}
        <code className="inline-code">VAPID_PRIVATE_KEY</code>, and schedule{' '}
        <code className="inline-code">send-reminders</code> daily (see{' '}
        <code className="inline-code">supabase/functions</code>).
      </p>

      <button
        type="button"
        className="btn btn--ghost btn--block"
        style={{ marginTop: 8 }}
        onClick={() => void sendTest()}
      >
        Send test email &amp; push now
      </button>
      {testStatus ? (
        <p className="muted small" style={{ marginTop: 8 }}>
          {testStatus}
        </p>
      ) : null}
    </section>
  )
}

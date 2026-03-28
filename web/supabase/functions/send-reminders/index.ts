/**
 * Daily reminder job: email + web push for bills due in N days (per user prefs).
 * Invoke from Supabase scheduled functions or external cron:
 *   curl -X POST "$SUPABASE_URL/functions/v1/send-reminders" -H "Authorization: Bearer $CRON_SECRET"
 * Secret CRON_SECRET must match what you set in Supabase Function secrets.
 * Also needs: RESEND_API_KEY, VAPID_*, SUPABASE_SERVICE_ROLE_KEY (usually auto-provided).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import webpush from 'npm:web-push@3.6.7'

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** True if today is exactly `daysBefore` days before the bill due date */
function isReminderDay(dueDateStr: string, daysBefore: number): boolean {
  const due = startOfDay(new Date(dueDateStr + 'T12:00:00'))
  const remind = startOfDay(new Date(due))
  remind.setDate(remind.getDate() - daysBefore)
  const today = startOfDay(new Date())
  return remind.getTime() === today.getTime()
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const cronSecret = Deno.env.get('CRON_SECRET')
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!cronSecret || token !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const vapidPub = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPriv = Deno.env.get('VAPID_PRIVATE_KEY')

  const admin = createClient(url, serviceKey)

  const { data: allPrefs, error: pErr } = await admin
    .from('notification_preferences')
    .select('user_id, email_reminders_enabled, push_reminders_enabled, reminder_days_before')

  if (pErr) {
    return new Response(JSON.stringify({ error: pErr.message }), { status: 500 })
  }

  const prefs = (allPrefs ?? []).filter(
    (p) => p.email_reminders_enabled || p.push_reminders_enabled,
  )

  if (vapidPub && vapidPriv) {
    webpush.setVapidDetails(
      'mailto:support@budgio.app',
      vapidPub,
      vapidPriv,
    )
  }

  let emailsSent = 0
  let pushesSent = 0

  for (const pref of prefs ?? []) {
    const days = Math.min(30, Math.max(0, pref.reminder_days_before ?? 3))

    const { data: profile } = await admin
      .from('profiles')
      .select('household_id, account_email')
      .eq('id', pref.user_id)
      .maybeSingle()

    if (!profile?.household_id) continue

    const { data: bills } = await admin
      .from('bills')
      .select('label, amount, due_date')
      .eq('household_id', profile.household_id)

    const upcoming = (bills ?? []).filter((b) =>
      isReminderDay(String(b.due_date), days),
    )
    if (!upcoming.length) continue

    const lines = upcoming
      .map(
        (b) =>
          `• ${b.label}: $${Number(b.amount)} due ${b.due_date}`,
      )
      .join('\n')
    const subject = `Budgio IQ — ${upcoming.length} bill reminder(s)`
    const bodyText = `Upcoming bills (${days} day(s) notice):\n\n${lines}`
    const bodyHtml = `<p>Upcoming bills (${days} day(s) notice):</p><ul>${upcoming.map((b) => `<li><strong>${b.label}</strong> — $${Number(b.amount)} (due ${b.due_date})</li>`).join('')}</ul>`

    const toEmail = profile.account_email
    if (pref.email_reminders_enabled && resendKey && toEmail) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Budgio IQ <onboarding@resend.dev>',
          to: [toEmail],
          subject,
          html: bodyHtml,
          text: bodyText,
        }),
      })
      if (r.ok) emailsSent++
    }

    if (pref.push_reminders_enabled && vapidPub && vapidPriv) {
      const { data: subs } = await admin
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', pref.user_id)

      const payload = JSON.stringify({
        title: subject,
        body: bodyText.slice(0, 180),
      })

      for (const s of subs ?? []) {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            payload,
            { TTL: 86_400 },
          )
          pushesSent++
        } catch {
          /* ignore bad subscriptions */
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, emailsSent, pushesSent, users: prefs?.length ?? 0 }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})

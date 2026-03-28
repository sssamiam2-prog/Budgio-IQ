/**
 * Sends a one-off test email + web push to the authenticated user.
 * Secrets: RESEND_API_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (and Supabase defaults).
 * Deploy: supabase functions deploy send-test-reminder --no-verify-jwt false
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import webpush from 'npm:web-push@3.6.7'

const cors: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()
    if (userErr || !user?.email) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    const vapidPub = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPriv = Deno.env.get('VAPID_PRIVATE_KEY')

    const results: Record<string, string> = {}

    if (resendKey) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Budgio IQ <onboarding@resend.dev>',
          to: [user.email],
          subject: 'Budgio IQ — test reminder',
          html: '<p>This is a test email from Budgio IQ. Bill and income reminders will look like this.</p>',
        }),
      })
      results.email = r.ok ? 'sent' : await r.text()
    } else {
      results.email = 'skipped (set RESEND_API_KEY)'
    }

    if (vapidPub && vapidPriv) {
      webpush.setVapidDetails(
        'mailto:support@budgio.app',
        vapidPub,
        vapidPriv,
      )
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', user.id)

      let sent = 0
      for (const s of subs ?? []) {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            JSON.stringify({
              title: 'Budgio IQ',
              body: 'Test push — reminders will appear like this.',
            }),
            { TTL: 86_400 },
          )
          sent++
        } catch (e) {
          console.error('webpush error', e)
        }
      }
      results.push = subs?.length ? `sent ${sent}/${subs.length}` : 'no subscriptions'
    } else {
      results.push = 'skipped (set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY)'
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

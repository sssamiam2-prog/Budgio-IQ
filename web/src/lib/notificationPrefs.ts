import { supabase } from './supabase'

export type NotificationPreferences = {
  email_reminders_enabled: boolean
  push_reminders_enabled: boolean
  reminder_days_before: number
}

const defaults: NotificationPreferences = {
  email_reminders_enabled: true,
  push_reminders_enabled: true,
  reminder_days_before: 3,
}

export async function fetchNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  if (!supabase) return defaults
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return defaults
  return {
    email_reminders_enabled: data.email_reminders_enabled ?? true,
    push_reminders_enabled: data.push_reminders_enabled ?? true,
    reminder_days_before: Math.min(
      30,
      Math.max(0, Number(data.reminder_days_before) || 3),
    ),
  }
}

export async function upsertNotificationPreferences(
  userId: string,
  prefs: Partial<NotificationPreferences>,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('notification_preferences').upsert(
    {
      user_id: userId,
      email_reminders_enabled:
        prefs.email_reminders_enabled ?? defaults.email_reminders_enabled,
      push_reminders_enabled:
        prefs.push_reminders_enabled ?? defaults.push_reminders_enabled,
      reminder_days_before:
        prefs.reminder_days_before ?? defaults.reminder_days_before,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw error
}

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { toExpoWeekday, type ReminderPlan } from '../domain/reminders';

const CHANNEL_ID = 'reminders';
const BODY = 'Your workout is ready when you are.';

// Android needs a channel before the permission prompt can appear.
export async function ensureReminderPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Workout reminders',
      // eslint-disable-next-line import/namespace -- the enum exists; the rule can't resolve it
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

// Android 12+ delivers reminders at an approximate time unless the app may schedule exact
// alarms. Returns true when exact delivery is available. It never throws: if the check
// is not possible (for example in Expo Go), reminders still work, just less precisely.
export async function ensureExactAlarmAccess(): Promise<boolean> {
  try {
    const current = await Notifications.getExactAlarmPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestExactAlarmPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

// Replaces every scheduled reminder with the plan. Safe to call with no days
// (that just clears them). Reminders are the only notifications this app
// schedules, so cancelling "all" is fine.
// Returns how many reminders the system now has scheduled, so the caller can
// confirm the plan really was set.
export async function applyReminders(plan: ReminderPlan): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const day of plan.days) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Repnest', body: BODY },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: toExpoWeekday(day),
        hour: Math.floor(plan.minuteOfDay / 60),
        minute: plan.minuteOfDay % 60,
        channelId: CHANNEL_ID,
      },
    });
  }
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.length;
}

// Sends a reminder in 5 seconds so you can check delivery without waiting for the real time.
export async function sendTestReminder(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Repnest', body: BODY },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL_ID,
    },
  });
}

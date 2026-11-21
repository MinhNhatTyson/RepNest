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

// Replaces every scheduled reminder with the plan. Safe to call with no days
// (that just clears them). Reminders are the only notifications this app
// schedules, so cancelling "all" is fine.
export async function applyReminders(plan: ReminderPlan): Promise<void> {
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
}

// Dev-only helper so you can check delivery without waiting for the real time.
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

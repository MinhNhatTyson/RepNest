import type { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_WEEKLY_GOAL, MAX_WEEKLY_GOAL } from '../domain/consistency';
import {
  DEFAULT_REMINDER_MINUTE,
  MAX_MINUTE_OF_DAY,
  parseDays,
  type ReminderPlan,
} from '../domain/reminders';

export async function getReminderPlan(db: SQLiteDatabase): Promise<ReminderPlan> {
  const [rawDays, rawTime] = await Promise.all([
    getSetting(db, 'reminder_days'),
    getSetting(db, 'reminder_time'),
  ]);
  const t = Number(rawTime);
  const valid = rawTime !== null && Number.isInteger(t) && t >= 0 && t <= MAX_MINUTE_OF_DAY;
  return { days: parseDays(rawDays), minuteOfDay: valid ? t : DEFAULT_REMINDER_MINUTE };
}

export async function setReminderPlan(db: SQLiteDatabase, plan: ReminderPlan): Promise<void> {
  await setSetting(db, 'reminder_days', plan.days.join(','));
  await setSetting(db, 'reminder_time', String(plan.minuteOfDay));
}

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

export async function getWeeklyGoal(db: SQLiteDatabase): Promise<number> {
  const n = Number(await getSetting(db, 'weekly_goal'));
  return Number.isInteger(n) && n >= 1 && n <= MAX_WEEKLY_GOAL ? n : DEFAULT_WEEKLY_GOAL;
}

export async function setWeeklyGoal(db: SQLiteDatabase, goal: number): Promise<void> {
  await setSetting(db, 'weekly_goal', String(goal));
}

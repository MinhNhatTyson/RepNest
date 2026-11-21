import type { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_WEEKLY_GOAL, MAX_WEEKLY_GOAL } from '../domain/consistency';

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

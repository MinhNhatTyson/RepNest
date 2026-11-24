import { File } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import { restoreBackupData } from '../db/backupRepository';
import { SCHEMA_VERSION } from '../db/migrations';
import { getReminderPlan } from '../db/settingsRepository';
import { parseBackup, type Backup } from '../domain/backup';
import { applyReminders, ensureReminderPermission } from './reminders';

export type PickBackupResult =
  | { status: 'canceled' }
  | { status: 'invalid'; reason: string }
  | { status: 'ready'; backup: Backup };

// Opens the system file picker and validates the chosen file. Changes nothing.
export async function pickBackup(): Promise<PickBackupResult> {
  const picked = await File.pickFileAsync();
  if (picked.canceled) return { status: 'canceled' };
  const parsed = parseBackup(await picked.result.text(), SCHEMA_VERSION);
  return parsed.ok
    ? { status: 'ready', backup: parsed.backup }
    : { status: 'invalid', reason: parsed.reason };
}

// Replaces all data with the backup, then re-creates the system reminders from the
// restored settings (scheduled notifications live in Android, not in the database).
// A reminder problem never undoes the restore; it is reported through the flag.
export async function applyBackup(
  db: SQLiteDatabase,
  backup: Backup,
): Promise<{ remindersReady: boolean }> {
  await restoreBackupData(db, backup.data);
  try {
    const plan = await getReminderPlan(db);
    if (plan.days.length === 0) {
      await applyReminders(plan); // clears anything scheduled before the restore
      return { remindersReady: true };
    }
    if (!(await ensureReminderPermission())) return { remindersReady: false };
    return { remindersReady: (await applyReminders(plan)) === plan.days.length };
  } catch {
    return { remindersReady: false };
  }
}

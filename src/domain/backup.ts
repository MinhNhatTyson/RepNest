// Pure helpers for the JSON backup. Rows keep the exact SQLite column names so a
// later "restore" can insert them back without any mapping.

export const BACKUP_APP = 'repnest';
export const BACKUP_FORMAT = 1;

export type BackupWorkoutRow = {
  id: number;
  name: string;
  notes: string;
  created_at: number;
  program: string | null;
  program_order: number | null;
};

export type BackupWorkoutExerciseRow = {
  id: number;
  workout_id: number;
  exercise_id: number;
  order_index: number;
  target_sets: number;
  target_reps: number | null;
  target_seconds: number | null;
  rest_seconds: number;
};

export type BackupSessionRow = {
  id: number;
  workout_id: number | null;
  name: string;
  started_at: number;
  ended_at: number;
  notes: string;
  kind: string;
};

export type BackupSessionSetRow = {
  id: number;
  session_id: number;
  exercise_id: number;
  exercise_name: string;
  set_index: number;
  reps: number | null;
  weight_kg: number | null;
  seconds: number | null;
  completed_at: number;
};

export type BackupSettingRow = { key: string; value: string };

// Only user-created exercises: the seeded library is recreated by migration 1.
export type BackupCustomExerciseRow = {
  id: number;
  name: string;
  muscle_group: string;
  equipment: string;
  type: string;
  instructions: string;
};

export type BackupData = {
  workouts: BackupWorkoutRow[];
  workoutExercises: BackupWorkoutExerciseRow[];
  sessions: BackupSessionRow[];
  sessionSets: BackupSessionSetRow[];
  settings: BackupSettingRow[];
  customExercises: BackupCustomExerciseRow[];
};

export type Backup = {
  app: typeof BACKUP_APP;
  format: typeof BACKUP_FORMAT;
  schemaVersion: number; // PRAGMA user_version of the database that was exported
  exportedAt: number; // ms since epoch
  data: BackupData;
};

export function buildBackup(data: BackupData, schemaVersion: number, now: number): Backup {
  return { app: BACKUP_APP, format: BACKUP_FORMAT, schemaVersion, exportedAt: now, data };
}

export function serializeBackup(backup: Backup): string {
  return JSON.stringify(backup);
}

// Local date, so a backup made at 23:30 is named for the day you made it.
export function backupFileName(now: number): string {
  const d = new Date(now);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `repnest-backup-${d.getFullYear()}-${mm}-${dd}.json`;
}

export function summarizeBackup(backup: Backup): {
  workouts: number;
  sessions: number;
  sets: number;
} {
  return {
    workouts: backup.data.workouts.length,
    sessions: backup.data.sessions.length,
    sets: backup.data.sessionSets.length,
  };
}

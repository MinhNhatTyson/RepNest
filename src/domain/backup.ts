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
export type ParseBackupResult = { ok: true; backup: Backup } | { ok: false; reason: string };

type FieldKind = 'int' | 'num' | 'str' | 'intOrNull' | 'numOrNull' | 'strOrNull';

// Every column of every table, with the type it must have. Missing = invalid.
const TABLE_SPEC: Record<keyof BackupData, Record<string, FieldKind>> = {
  workouts: {
    id: 'int',
    name: 'str',
    notes: 'str',
    created_at: 'num',
    program: 'strOrNull',
    program_order: 'intOrNull',
  },
  workoutExercises: {
    id: 'int',
    workout_id: 'int',
    exercise_id: 'int',
    order_index: 'int',
    target_sets: 'int',
    target_reps: 'intOrNull',
    target_seconds: 'intOrNull',
    rest_seconds: 'int',
  },
  sessions: {
    id: 'int',
    workout_id: 'intOrNull',
    name: 'str',
    started_at: 'num',
    ended_at: 'num',
    notes: 'str',
    kind: 'str',
  },
  sessionSets: {
    id: 'int',
    session_id: 'int',
    exercise_id: 'int',
    exercise_name: 'str',
    set_index: 'int',
    reps: 'intOrNull',
    weight_kg: 'numOrNull',
    seconds: 'intOrNull',
    completed_at: 'num',
  },
  settings: { key: 'str', value: 'str' },
  customExercises: {
    id: 'int',
    name: 'str',
    muscle_group: 'str',
    equipment: 'str',
    type: 'str',
    instructions: 'str',
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fieldOk(value: unknown, kind: FieldKind): boolean {
  if (value === null) return kind.endsWith('OrNull');
  if (kind === 'str' || kind === 'strOrNull') return typeof value === 'string';
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  return kind === 'int' || kind === 'intOrNull' ? Number.isInteger(value) : true;
}

const fail = (reason: string): ParseBackupResult => ({ ok: false, reason });
const DAMAGED = 'This backup contains damaged data.';

// Checks a backup file's text before anything touches the database.
// Only a backup made at the same schema version as the app is accepted for now.
export function parseBackup(text: string, currentSchemaVersion: number): ParseBackupResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail('This file is not a valid backup.');
  }

  if (!isRecord(raw) || raw.app !== BACKUP_APP) return fail('This is not a Repnest backup.');
  if (raw.format !== BACKUP_FORMAT) return fail('This backup format is not supported.');

  const version = raw.schemaVersion;
  const exportedAt = raw.exportedAt;
  const data = raw.data;
  if (typeof version !== 'number' || !Number.isInteger(version)) return fail(DAMAGED);
  if (typeof exportedAt !== 'number' || !isRecord(data)) return fail(DAMAGED);
  if (version > currentSchemaVersion) {
    return fail('This backup was made by a newer version of Repnest. Update the app first.');
  }
  if (version < currentSchemaVersion) {
    return fail('This backup was made by an older version of Repnest and cannot be restored yet.');
  }

  for (const table of Object.keys(TABLE_SPEC) as (keyof BackupData)[]) {
    const rows = data[table];
    if (!Array.isArray(rows)) return fail('This backup is incomplete.');
    for (const row of rows) {
      if (!isRecord(row)) return fail(DAMAGED);
      for (const [field, kind] of Object.entries(TABLE_SPEC[table])) {
        if (!fieldOk(row[field], kind)) return fail(DAMAGED);
      }
    }
  }

  // Every field has the right type now, so the cast is safe.
  const typed = data as BackupData;
  const workoutIds = new Set(typed.workouts.map((w) => w.id));
  const sessionIds = new Set(typed.sessions.map((s) => s.id));
  const linksOk =
    typed.workoutExercises.every((r) => workoutIds.has(r.workout_id)) &&
    typed.sessions.every((s) => s.workout_id === null || workoutIds.has(s.workout_id)) &&
    typed.sessionSets.every((r) => sessionIds.has(r.session_id));
  const valuesOk =
    typed.sessions.every((s) => s.kind === 'full' || s.kind === 'lite') &&
    typed.customExercises.every((e) => e.type === 'reps' || e.type === 'timed');
  if (!linksOk || !valuesOk) return fail(DAMAGED);

  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      format: BACKUP_FORMAT,
      schemaVersion: version,
      exportedAt,
      data: typed,
    },
  };
}

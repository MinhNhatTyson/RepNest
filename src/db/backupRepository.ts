import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  BackupCustomExerciseRow,
  BackupData,
  BackupSessionRow,
  BackupSessionSetRow,
  BackupSettingRow,
  BackupWorkoutExerciseRow,
  BackupWorkoutRow,
} from '../domain/backup';

// Reads every user table inside one transaction so the snapshot is consistent.
export async function readBackupData(
  db: SQLiteDatabase,
): Promise<{ schemaVersion: number; data: BackupData }> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const schemaVersion = versionRow?.user_version ?? 0;

  // `as ... | null` stops TypeScript from narrowing this to plain `null` after the closure.
  let data = null as BackupData | null;

  await db.withTransactionAsync(async () => {
    data = {
      workouts: await db.getAllAsync<BackupWorkoutRow>(
        'SELECT id, name, notes, created_at, program, program_order FROM workouts ORDER BY id',
      ),
      workoutExercises: await db.getAllAsync<BackupWorkoutExerciseRow>(
        `SELECT id, workout_id, exercise_id, order_index, target_sets, target_reps,
                target_seconds, rest_seconds
         FROM workout_exercises ORDER BY id`,
      ),
      sessions: await db.getAllAsync<BackupSessionRow>(
        'SELECT id, workout_id, name, started_at, ended_at, notes, kind FROM sessions ORDER BY id',
      ),
      sessionSets: await db.getAllAsync<BackupSessionSetRow>(
        `SELECT id, session_id, exercise_id, exercise_name, set_index, reps, weight_kg,
                seconds, completed_at
         FROM session_sets ORDER BY id`,
      ),
      settings: await db.getAllAsync<BackupSettingRow>(
        'SELECT key, value FROM settings ORDER BY key',
      ),
      customExercises: await db.getAllAsync<BackupCustomExerciseRow>(
        `SELECT id, name, muscle_group, equipment, type, instructions
         FROM exercises WHERE is_custom = 1 ORDER BY id`,
      ),
    };
  });

  if (!data) throw new Error('Backup read did not complete');
  return { schemaVersion, data };
}
// Erases everything the user owns and inserts the backup, in one transaction: if any
// row is refused, SQLite rolls back and the old data is untouched. Ids are kept, so
// every reference (including to seeded exercises) stays valid.
export async function restoreBackupData(db: SQLiteDatabase, data: BackupData): Promise<void> {
  await db.withTransactionAsync(async () => {
    // Children first, because of the foreign keys.
    await db.runAsync('DELETE FROM session_sets');
    await db.runAsync('DELETE FROM sessions');
    await db.runAsync('DELETE FROM workout_exercises');
    await db.runAsync('DELETE FROM workouts');
    await db.runAsync('DELETE FROM settings');
    await db.runAsync('DELETE FROM exercises WHERE is_custom = 1');

    for (const e of data.customExercises) {
      await db.runAsync(
        `INSERT INTO exercises (id, name, muscle_group, equipment, type, instructions, is_custom)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        e.id,
        e.name,
        e.muscle_group,
        e.equipment,
        e.type,
        e.instructions,
      );
    }
    for (const w of data.workouts) {
      await db.runAsync(
        `INSERT INTO workouts (id, name, notes, created_at, program, program_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        w.id,
        w.name,
        w.notes,
        w.created_at,
        w.program,
        w.program_order,
      );
    }
    for (const r of data.workoutExercises) {
      await db.runAsync(
        `INSERT INTO workout_exercises
           (id, workout_id, exercise_id, order_index, target_sets, target_reps, target_seconds, rest_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        r.id,
        r.workout_id,
        r.exercise_id,
        r.order_index,
        r.target_sets,
        r.target_reps,
        r.target_seconds,
        r.rest_seconds,
      );
    }
    for (const s of data.sessions) {
      await db.runAsync(
        `INSERT INTO sessions (id, workout_id, name, started_at, ended_at, notes, kind)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        s.id,
        s.workout_id,
        s.name,
        s.started_at,
        s.ended_at,
        s.notes,
        s.kind,
      );
    }
    for (const r of data.sessionSets) {
      await db.runAsync(
        `INSERT INTO session_sets
           (id, session_id, exercise_id, exercise_name, set_index, reps, weight_kg, seconds, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        r.id,
        r.session_id,
        r.exercise_id,
        r.exercise_name,
        r.set_index,
        r.reps,
        r.weight_kg,
        r.seconds,
        r.completed_at,
      );
    }
    for (const s of data.settings) {
      await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', s.key, s.value);
    }
  });
}

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

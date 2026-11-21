import type { SQLiteDatabase } from 'expo-sqlite';
import type { ActiveSession, PreviousSet } from '../domain/types';

type PreviousRow = { reps: number | null; weight_kg: number | null; seconds: number | null };

// For each exercise, the sets from the most recent session that included it.
export async function getPreviousSets(
  db: SQLiteDatabase,
  exerciseIds: number[],
): Promise<Record<number, PreviousSet[]>> {
  const result: Record<number, PreviousSet[]> = {};
  for (const id of [...new Set(exerciseIds)]) {
    const rows = await db.getAllAsync<PreviousRow>(
      `SELECT reps, weight_kg, seconds FROM session_sets
       WHERE exercise_id = ?
         AND session_id = (
           SELECT session_id FROM session_sets
           WHERE exercise_id = ? ORDER BY completed_at DESC LIMIT 1
         )
       ORDER BY set_index`,
      id,
      id,
    );
    result[id] = rows.map((r) => ({ reps: r.reps, weightKg: r.weight_kg, seconds: r.seconds }));
  }
  return result;
}

export async function saveSession(db: SQLiteDatabase, session: ActiveSession): Promise<number> {
  let sessionId = 0;

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO sessions (workout_id, name, started_at, ended_at, notes, kind)
      VALUES (?, ?, ?, ?, ?,
        CASE WHEN EXISTS (SELECT 1 FROM workouts WHERE id = ? AND program = 'lite')
              THEN 'lite' ELSE 'full' END)`,
      session.workoutId,
      session.name,
      session.startedAt,
      Date.now(),
      '',
      session.workoutId,
    );
    sessionId = result.lastInsertRowId;

    for (const exercise of session.exercises) {
      for (const [index, set] of exercise.sets.entries()) {
        await db.runAsync(
          `INSERT INTO session_sets
             (session_id, exercise_id, exercise_name, set_index, reps, weight_kg, seconds, completed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          sessionId,
          exercise.exerciseId,
          exercise.exerciseName,
          index,
          set.reps,
          set.weightKg,
          set.seconds,
          set.completedAt,
        );
      }
    }
  });

  return sessionId;
}
// When each finished session ended (ms since epoch), oldest first.
export async function getSessionEndTimes(db: SQLiteDatabase): Promise<number[]> {
  const rows = await db.getAllAsync<{ ended_at: number }>(
    'SELECT ended_at FROM sessions ORDER BY ended_at',
  );
  return rows.map((r) => r.ended_at);
}

import type { SQLiteDatabase } from 'expo-sqlite';
import { nextInRotation } from '../domain/program';

// Rotates A -> B -> C -> A based on the most recent finished starter session.
export async function getNextStarterWorkoutId(db: SQLiteDatabase): Promise<number | null> {
  const starters = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM workouts WHERE program = 'starter' ORDER BY program_order`,
  );
  const last = await db.getFirstAsync<{ workout_id: number }>(
    `SELECT s.workout_id
     FROM sessions s
     JOIN workouts w ON w.id = s.workout_id
     WHERE w.program = 'starter'
     ORDER BY s.ended_at DESC
     LIMIT 1`,
  );
  return nextInRotation(
    starters.map((row) => row.id),
    last?.workout_id ?? null,
  );
}
export async function getLiteWorkoutId(db: SQLiteDatabase): Promise<number | null> {
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM workouts WHERE program = 'lite' ORDER BY program_order LIMIT 1`,
  );
  return row?.id ?? null;
}

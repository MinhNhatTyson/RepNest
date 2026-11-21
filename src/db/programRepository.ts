import type { SQLiteDatabase } from 'expo-sqlite';
import { nextInRotation } from '../domain/program';
import { applyRamp, levelFor } from '../domain/ramp';
import type { WorkoutDraft } from '../domain/types';
import { getWorkout } from './workoutRepository';

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
export async function countStarterSessions(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n
     FROM sessions s
     JOIN workouts w ON w.id = s.workout_id
     WHERE w.program = 'starter'`,
  );
  return row?.n ?? 0;
}

// A workout ready to start. Starter workouts get the slow ramp applied;
// everything else is returned as saved.
export async function getWorkoutForStart(
  db: SQLiteDatabase,
  workoutId: number,
): Promise<{ workout: WorkoutDraft; program: string | null } | null> {
  const workout = await getWorkout(db, workoutId);
  if (!workout) return null;
  const row = await db.getFirstAsync<{ program: string | null }>(
    'SELECT program FROM workouts WHERE id = ?',
    workoutId,
  );
  const program = row?.program ?? null;
  if (program !== 'starter') return { workout, program };
  const level = levelFor(await countStarterSessions(db));
  return { workout: applyRamp(workout, level), program };
}

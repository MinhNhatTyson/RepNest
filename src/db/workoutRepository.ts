import type { SQLiteDatabase } from 'expo-sqlite';
import type { ExerciseType, WorkoutDraft, WorkoutItem, WorkoutSummary } from '../domain/types';

type SummaryRow = { id: number; name: string; exercise_count: number; program: string | null };

type ItemRow = {
  id: number;
  exercise_id: number;
  exercise_name: string;
  type: ExerciseType;
  target_sets: number;
  target_reps: number | null;
  target_seconds: number | null;
  rest_seconds: number;
};

export async function listWorkouts(db: SQLiteDatabase): Promise<WorkoutSummary[]> {
  const rows = await db.getAllAsync<SummaryRow>(
    `SELECT w.id, w.name, w.program, COUNT(we.id) AS exercise_count
     FROM workouts w
     LEFT JOIN workout_exercises we ON we.workout_id = w.id
     GROUP BY w.id
     ORDER BY (w.program IS NOT NULL), w.program DESC, w.program_order, w.created_at DESC`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    exerciseCount: r.exercise_count,
    program: r.program,
  }));
}

export async function getWorkout(db: SQLiteDatabase, id: number): Promise<WorkoutDraft | null> {
  const workout = await db.getFirstAsync<{ id: number; name: string }>(
    'SELECT id, name FROM workouts WHERE id = ?',
    id,
  );
  if (!workout) return null;

  const rows = await db.getAllAsync<ItemRow>(
    `SELECT we.id, we.exercise_id, e.name AS exercise_name, e.type,
            we.target_sets, we.target_reps, we.target_seconds, we.rest_seconds
     FROM workout_exercises we
     JOIN exercises e ON e.id = we.exercise_id
     WHERE we.workout_id = ?
     ORDER BY we.order_index`,
    id,
  );

  const items: WorkoutItem[] = rows.map((r) => ({
    key: String(r.id),
    exerciseId: r.exercise_id,
    exerciseName: r.exercise_name,
    type: r.type,
    targetSets: r.target_sets,
    targetReps: r.target_reps,
    targetSeconds: r.target_seconds,
    restSeconds: r.rest_seconds,
  }));

  return { id: workout.id, name: workout.name, items };
}

// Inserts or updates a workout. On update, the item rows are replaced wholesale.
export async function saveWorkout(db: SQLiteDatabase, draft: WorkoutDraft): Promise<number> {
  const name = draft.name.trim();
  let savedId = draft.id ?? 0;

  await db.withTransactionAsync(async () => {
    if (draft.id === null) {
      const result = await db.runAsync(
        'INSERT INTO workouts (name, notes, created_at) VALUES (?, ?, ?)',
        name,
        '',
        Date.now(),
      );
      savedId = result.lastInsertRowId;
    } else {
      await db.runAsync('UPDATE workouts SET name = ? WHERE id = ?', name, draft.id);
      await db.runAsync('DELETE FROM workout_exercises WHERE workout_id = ?', draft.id);
    }

    for (const [index, item] of draft.items.entries()) {
      await db.runAsync(
        `INSERT INTO workout_exercises
           (workout_id, exercise_id, order_index, target_sets, target_reps, target_seconds, rest_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        savedId,
        item.exerciseId,
        index,
        item.targetSets,
        item.targetReps,
        item.targetSeconds,
        item.restSeconds,
      );
    }
  });

  return savedId;
}

export async function duplicateWorkout(db: SQLiteDatabase, id: number): Promise<void> {
  const source = await getWorkout(db, id);
  if (!source) return;
  await saveWorkout(db, { ...source, id: null, name: `${source.name} (copy)` });
}

export async function deleteWorkout(db: SQLiteDatabase, id: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM workout_exercises WHERE workout_id = ?', id);
    await db.runAsync('DELETE FROM workouts WHERE id = ?', id);
  });
}

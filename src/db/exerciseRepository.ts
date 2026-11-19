import type { SQLiteDatabase } from 'expo-sqlite';
import type { Equipment, Exercise, ExerciseType, MuscleGroup } from '../domain/types';

type ExerciseRow = {
  id: number;
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment;
  type: ExerciseType;
  instructions: string;
  is_custom: number;
};

const COLUMNS = 'id, name, muscle_group, equipment, type, instructions, is_custom';

function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    equipment: row.equipment,
    type: row.type,
    instructions: row.instructions,
    isCustom: row.is_custom === 1,
  };
}

export type ExerciseFilters = {
  query?: string;
  muscleGroup?: MuscleGroup | null;
  equipment?: Equipment | null;
};

export async function searchExercises(
  db: SQLiteDatabase,
  { query, muscleGroup, equipment }: ExerciseFilters = {},
): Promise<Exercise[]> {
  const conditions: string[] = [];
  const params: string[] = [];

  const trimmed = query?.trim();
  if (trimmed) {
    conditions.push('name LIKE ?'); // case-insensitive for ASCII in SQLite
    params.push(`%${trimmed}%`);
  }
  if (muscleGroup) {
    conditions.push('muscle_group = ?');
    params.push(muscleGroup);
  }
  if (equipment) {
    conditions.push('equipment = ?');
    params.push(equipment);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await db.getAllAsync<ExerciseRow>(
    `SELECT ${COLUMNS} FROM exercises ${where} ORDER BY name COLLATE NOCASE`,
    params,
  );
  return rows.map(toExercise);
}

export async function getExerciseById(db: SQLiteDatabase, id: number): Promise<Exercise | null> {
  const row = await db.getFirstAsync<ExerciseRow>(
    `SELECT ${COLUMNS} FROM exercises WHERE id = ?`,
    id,
  );
  return row ? toExercise(row) : null;
}

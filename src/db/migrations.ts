import type { SQLiteDatabase } from 'expo-sqlite';
import { SEED_EXERCISES } from './seed';

type Migration = (db: SQLiteDatabase) => Promise<void>;

// Index 0 brings the DB to version 1, index 1 to version 2, and so on.
// NEVER edit a migration that has already run on your phone: add a new one.
const migrations: Migration[] = [
  async (db) => {
    await db.execAsync(`
      CREATE TABLE exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        muscle_group TEXT NOT NULL,
        equipment TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('reps', 'timed')),
        instructions TEXT NOT NULL DEFAULT '',
        is_custom INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_exercises_name ON exercises (name COLLATE NOCASE);
    `);

    for (const [name, muscleGroup, equipment, type, instructions] of SEED_EXERCISES) {
      await db.runAsync(
        `INSERT INTO exercises (name, muscle_group, equipment, type, instructions, is_custom)
         VALUES (?, ?, ?, ?, ?, 0)`,
        name,
        muscleGroup,
        equipment,
        type,
        instructions,
      );
    }
  },
  async (db) => {
    await db.execAsync(`
      CREATE TABLE workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL
      );
      CREATE TABLE workout_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER NOT NULL REFERENCES workouts (id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises (id),
        order_index INTEGER NOT NULL,
        target_sets INTEGER NOT NULL,
        target_reps INTEGER,
        target_seconds INTEGER,
        rest_seconds INTEGER NOT NULL
      );
      CREATE INDEX idx_workout_exercises_workout
        ON workout_exercises (workout_id, order_index);
    `);
  },
  async (db) => {
    await db.execAsync(`
      CREATE TABLE sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER REFERENCES workouts (id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER NOT NULL,
        notes TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE session_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL,
        exercise_name TEXT NOT NULL,
        set_index INTEGER NOT NULL,
        reps INTEGER,
        weight_kg REAL,
        seconds INTEGER,
        completed_at INTEGER NOT NULL
      );
      CREATE INDEX idx_session_sets_session ON session_sets (session_id, set_index);
      CREATE INDEX idx_session_sets_exercise ON session_sets (exercise_id, completed_at);
    `);
  },
];

export async function migrateDb(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  for (let version = currentVersion; version < migrations.length; version++) {
    // One transaction per migration: it either fully applies or not at all.
    await db.withTransactionAsync(async () => {
      await migrations[version](db);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}

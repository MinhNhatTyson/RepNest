import {
  BACKUP_APP,
  BACKUP_FORMAT,
  backupFileName,
  buildBackup,
  serializeBackup,
  summarizeBackup,
  type BackupData,
} from '../backup';

// Tests run in America/New_York (see jest.global-setup.js).
// Month is 0-based, like Date.
const at = (y: number, m: number, d: number, h = 12, min = 0): number =>
  new Date(y, m, d, h, min).getTime();

const data: BackupData = {
  workouts: [
    { id: 1, name: 'Starter A', notes: '', created_at: 1000, program: 'starter', program_order: 0 },
  ],
  workoutExercises: [
    {
      id: 1,
      workout_id: 1,
      exercise_id: 27,
      order_index: 0,
      target_sets: 3,
      target_reps: 10,
      target_seconds: null,
      rest_seconds: 45,
    },
  ],
  sessions: [
    {
      id: 1,
      workout_id: 1,
      name: 'Starter A',
      started_at: 2000,
      ended_at: 3000,
      notes: '',
      kind: 'full',
    },
    {
      id: 2,
      workout_id: null, // the workout was deleted later: ON DELETE SET NULL
      name: 'Quick 5',
      started_at: 4000,
      ended_at: 5000,
      notes: '',
      kind: 'lite',
    },
  ],
  sessionSets: [
    {
      id: 1,
      session_id: 1,
      exercise_id: 27,
      exercise_name: 'Bodyweight squat',
      set_index: 0,
      reps: 10,
      weight_kg: null,
      seconds: null,
      completed_at: 2500,
    },
    {
      id: 2,
      session_id: 1,
      exercise_id: 20,
      exercise_name: 'Plank',
      set_index: 0,
      reps: null,
      weight_kg: null,
      seconds: 20,
      completed_at: 2600,
    },
  ],
  settings: [{ key: 'weekly_goal', value: '3' }],
  customExercises: [],
};

describe('buildBackup', () => {
  it('wraps the data with the app name, format and schema version', () => {
    const backup = buildBackup(data, 6, 123456);
    expect(backup).toEqual({
      app: BACKUP_APP,
      format: BACKUP_FORMAT,
      schemaVersion: 6,
      exportedAt: 123456,
      data,
    });
  });
});

describe('serializeBackup', () => {
  it('round-trips through JSON without losing nulls or empty lists', () => {
    const backup = buildBackup(data, 6, 123456);
    expect(JSON.parse(serializeBackup(backup))).toEqual(backup);
  });
});

describe('summarizeBackup', () => {
  it('counts workouts, sessions and sets', () => {
    expect(summarizeBackup(buildBackup(data, 6, 0))).toEqual({ workouts: 1, sessions: 2, sets: 2 });
  });

  it('is all zeros for an empty database', () => {
    const empty: BackupData = {
      workouts: [],
      workoutExercises: [],
      sessions: [],
      sessionSets: [],
      settings: [],
      customExercises: [],
    };
    expect(summarizeBackup(buildBackup(empty, 6, 0))).toEqual({ workouts: 0, sessions: 0, sets: 0 });
  });
});

describe('backupFileName', () => {
  it('uses the local date, zero-padded', () => {
    expect(backupFileName(at(2026, 0, 5, 9))).toBe('repnest-backup-2026-01-05.json');
    expect(backupFileName(at(2026, 10, 22, 15))).toBe('repnest-backup-2026-11-22.json');
  });

  it('names a late-evening backup for the day it was made, not the UTC day', () => {
    // 23:30 in New York is already the next day in UTC.
    expect(backupFileName(at(2026, 10, 22, 23, 30))).toBe('repnest-backup-2026-11-22.json');
    expect(backupFileName(at(2026, 11, 31, 23, 59))).toBe('repnest-backup-2026-12-31.json');
  });

  it('works on the DST days', () => {
    expect(backupFileName(at(2026, 2, 8, 12))).toBe('repnest-backup-2026-03-08.json');
    expect(backupFileName(at(2026, 10, 1, 12))).toBe('repnest-backup-2026-11-01.json');
  });
});

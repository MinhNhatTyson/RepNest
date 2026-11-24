import {
  BACKUP_APP,
  BACKUP_FORMAT,
  backupFileName,
  buildBackup,
  serializeBackup,
  summarizeBackup,
  parseBackup,
  type Backup,
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
    expect(summarizeBackup(buildBackup(empty, 6, 0))).toEqual({
      workouts: 0,
      sessions: 0,
      sets: 0,
    });
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
describe('parseBackup', () => {
  // A fresh deep copy each time, so tests can break it freely.
  const valid = (): Backup => JSON.parse(serializeBackup(buildBackup(data, 6, 123456)));
  const parse = (b: Backup, version = 6) => parseBackup(JSON.stringify(b), version);
  const reasonOf = (b: Backup, version = 6) => {
    const result = parse(b, version);
    return result.ok ? null : result.reason;
  };

  it('accepts a backup it just exported, nulls and all', () => {
    const result = parse(valid());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup).toEqual(buildBackup(data, 6, 123456));
  });

  it('rejects text that is not JSON', () => {
    expect(parseBackup('hello', 6)).toEqual({
      ok: false,
      reason: 'This file is not a valid backup.',
    });
    expect(parseBackup('', 6).ok).toBe(false);
  });

  it('rejects JSON that is not a backup, or that is some other app', () => {
    expect(parseBackup('[]', 6).ok).toBe(false);
    expect(parseBackup('null', 6).ok).toBe(false);
    const other = valid();
    (other as { app: string }).app = 'something-else';
    expect(reasonOf(other)).toMatch(/not a Repnest backup/);
  });

  it('rejects an unknown format', () => {
    const b = valid();
    (b as { format: number }).format = 2;
    expect(reasonOf(b)).toMatch(/format/);
  });

  it('rejects newer and older schema versions with a clear reason', () => {
    expect(reasonOf(valid(), 5)).toMatch(/newer/);
    expect(reasonOf(valid(), 7)).toMatch(/older/);
  });

  it('rejects a missing or non-array table', () => {
    const missing = valid();
    delete (missing.data as Partial<BackupData>).sessions;
    expect(reasonOf(missing)).toMatch(/incomplete/);

    const notArray = valid();
    (notArray.data as Record<string, unknown>).sessionSets = 'x';
    expect(reasonOf(notArray)).toMatch(/incomplete/);
  });

  it('rejects rows with a wrong type, a missing field or a fractional integer', () => {
    const wrongType = valid();
    (wrongType.data.workouts[0] as { name: unknown }).name = 5;
    expect(reasonOf(wrongType)).toMatch(/damaged/);

    const missingField = valid();
    delete (missingField.data.sessions[0] as Partial<BackupData['sessions'][number]>).ended_at;
    expect(reasonOf(missingField)).toMatch(/damaged/);

    const fractional = valid();
    fractional.data.sessionSets[0].reps = 2.5;
    expect(reasonOf(fractional)).toMatch(/damaged/);

    const notARow = valid();
    (notARow.data.settings as unknown[]).push('nope');
    expect(reasonOf(notARow)).toMatch(/damaged/);
  });

  it('allows fractional kilograms', () => {
    const b = valid();
    b.data.sessionSets[0].weight_kg = 2.5;
    expect(parse(b).ok).toBe(true);
  });

  it('rejects rows that point at rows that do not exist', () => {
    const exercise = valid();
    exercise.data.workoutExercises[0].workout_id = 99;
    expect(reasonOf(exercise)).toMatch(/damaged/);

    const session = valid();
    session.data.sessions[0].workout_id = 99;
    expect(reasonOf(session)).toMatch(/damaged/);

    const set = valid();
    set.data.sessionSets[0].session_id = 99;
    expect(reasonOf(set)).toMatch(/damaged/);
  });

  it('accepts a session whose workout was deleted (workout_id null)', () => {
    expect(parse(valid()).ok).toBe(true); // the sample data already has one
  });

  it('rejects a session kind or exercise type the database would refuse', () => {
    const kind = valid();
    kind.data.sessions[0].kind = 'weird';
    expect(reasonOf(kind)).toMatch(/damaged/);

    const type = valid();
    type.data.customExercises.push({
      id: 100,
      name: 'Odd',
      muscle_group: 'Core',
      equipment: 'Bodyweight',
      type: 'sometimes',
      instructions: '',
    });
    expect(reasonOf(type)).toMatch(/damaged/);
  });
});

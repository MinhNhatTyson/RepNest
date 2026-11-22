import {
  EASY_ROUNDS,
  MAX_LEVEL,
  SESSIONS_PER_ROUND,
  applyRamp,
  levelFor,
  stepsFor,
} from '../ramp';
import type { WorkoutDraft } from '../types';

const workout: WorkoutDraft = {
  id: 1,
  name: 'Starter A',
  items: [
    {
      key: '1',
      exerciseId: 10,
      exerciseName: 'Bodyweight squat',
      type: 'reps',
      targetSets: 3,
      targetReps: 10,
      targetSeconds: null,
      restSeconds: 45,
    },
    {
      key: '2',
      exerciseId: 20,
      exerciseName: 'Plank',
      type: 'timed',
      targetSets: 3,
      targetReps: null,
      targetSeconds: 20,
      restSeconds: 45,
    },
  ],
};

describe('levelFor', () => {
  it('moves up one level per round of finished sessions', () => {
    expect(levelFor(0)).toBe(0);
    expect(levelFor(SESSIONS_PER_ROUND - 1)).toBe(0);
    expect(levelFor(SESSIONS_PER_ROUND)).toBe(1);
    expect(levelFor(SESSIONS_PER_ROUND * 2)).toBe(2);
  });

  it('stops at the maximum level', () => {
    expect(levelFor(SESSIONS_PER_ROUND * MAX_LEVEL - 1)).toBe(MAX_LEVEL - 1);
    expect(levelFor(SESSIONS_PER_ROUND * MAX_LEVEL)).toBe(MAX_LEVEL);
    expect(levelFor(1000)).toBe(MAX_LEVEL);
  });

  it('never goes down as sessions are added', () => {
    let previous = 0;
    for (let n = 0; n <= 60; n++) {
      const level = levelFor(n);
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });
});

describe('stepsFor', () => {
  it('adds nothing during the easy rounds', () => {
    for (let level = 0; level < EASY_ROUNDS; level++) {
      expect(stepsFor(level)).toBe(0);
    }
  });

  it('adds one step per level after the easy rounds', () => {
    expect(stepsFor(2)).toBe(1);
    expect(stepsFor(3)).toBe(2);
    expect(stepsFor(MAX_LEVEL)).toBe(4);
  });
});

describe('applyRamp', () => {
  it('returns the workout untouched during the easy rounds', () => {
    expect(applyRamp(workout, 0)).toBe(workout);
    expect(applyRamp(workout, 1)).toBe(workout);
  });

  it('adds 1 rep and 5 seconds per step', () => {
    const ramped = applyRamp(workout, 2);
    expect(ramped.items[0].targetReps).toBe(11);
    expect(ramped.items[1].targetSeconds).toBe(25);
    expect(applyRamp(workout, MAX_LEVEL).items[0].targetReps).toBe(14);
    expect(applyRamp(workout, MAX_LEVEL).items[1].targetSeconds).toBe(40);
  });

  it('leaves the unused target as null', () => {
    const ramped = applyRamp(workout, MAX_LEVEL);
    expect(ramped.items[0].targetSeconds).toBeNull();
    expect(ramped.items[1].targetReps).toBeNull();
  });

  it('changes nothing except the targets', () => {
    const ramped = applyRamp(workout, 3);
    expect(ramped.id).toBe(workout.id);
    expect(ramped.name).toBe(workout.name);
    expect(ramped.items[0]).toEqual({ ...workout.items[0], targetReps: 12 });
    expect(ramped.items[1]).toEqual({ ...workout.items[1], targetSeconds: 30 });
  });

  it('does not mutate the original workout', () => {
    const before = JSON.parse(JSON.stringify(workout));
    applyRamp(workout, MAX_LEVEL);
    expect(workout).toEqual(before);
  });

  it('follows finished sessions: round 3 adds the first step, round 5+ is capped', () => {
    const squatReps = (finished: number) =>
      applyRamp(workout, levelFor(finished)).items[0].targetReps;
    expect(squatReps(5)).toBe(10); // still round 2
    expect(squatReps(6)).toBe(11); // round 3
    expect(squatReps(15)).toBe(14); // round 6 -> level capped at 5
    expect(squatReps(500)).toBe(14);
  });
});

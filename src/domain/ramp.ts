import type { WorkoutDraft } from './types';

// One round is one pass through the starter rotation (A, B, C).
export const SESSIONS_PER_ROUND = 3;
export const MAX_LEVEL = 5;
// Rounds 1-2 stay at the base targets. After that every round adds a little.
export const EASY_ROUNDS = 2;
const REPS_PER_STEP = 1;
const SECONDS_PER_STEP = 5;

// Level 0 = round 1. The ramp follows finished sessions, not calendar weeks,
// so a missed week pauses it instead of skipping ahead or resetting.
export function levelFor(finishedSessions: number): number {
  return Math.min(MAX_LEVEL, Math.floor(finishedSessions / SESSIONS_PER_ROUND));
}

export function stepsFor(level: number): number {
  return Math.max(0, level - (EASY_ROUNDS - 1));
}

export function applyRamp(workout: WorkoutDraft, level: number): WorkoutDraft {
  const steps = stepsFor(level);
  if (steps === 0) return workout;
  return {
    ...workout,
    items: workout.items.map((item) => ({
      ...item,
      targetReps: item.targetReps === null ? null : item.targetReps + steps * REPS_PER_STEP,
      targetSeconds:
        item.targetSeconds === null ? null : item.targetSeconds + steps * SECONDS_PER_STEP,
    })),
  };
}

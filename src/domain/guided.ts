import { suggestSet } from './session';
import type { ActiveExercise, ActiveSession, LoggedSet } from './types';

export type GuidedStep = { exercise: ActiveExercise; setIndex: number };

// The first exercise that still has sets to do, in workout order.
export function currentStep(session: ActiveSession | null): GuidedStep | null {
  if (!session) return null;
  for (const exercise of session.exercises) {
    if (exercise.sets.length < exercise.targetSets) {
      return { exercise, setIndex: exercise.sets.length };
    }
  }
  return null;
}

export function setProgress(session: ActiveSession): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const ex of session.exercises) {
    total += ex.targetSets;
    done += Math.min(ex.sets.length, ex.targetSets);
  }
  return { done, total };
}

// One tap logs the suggested numbers (last session's, else the workout's target).
export function buildLoggedSet(
  exercise: ActiveExercise,
  setIndex: number,
  seconds?: number,
): LoggedSet {
  const suggested = suggestSet(exercise, setIndex);
  if (exercise.type === 'timed') {
    return {
      reps: null,
      weightKg: null,
      seconds: seconds ?? suggested.amount,
      completedAt: Date.now(),
    };
  }
  return {
    reps: suggested.amount,
    weightKg: suggested.weight > 0 ? suggested.weight : null,
    seconds: null,
    completedAt: Date.now(),
  };
}

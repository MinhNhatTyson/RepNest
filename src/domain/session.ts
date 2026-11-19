import type { ActiveExercise, LoggedSet } from './types';

// Values to pre-fill the inputs with for the set at `index` (0-based).
export function suggestSet(ex: ActiveExercise, index: number): { amount: number; weight: number } {
  const prev = ex.previous[index] ?? ex.previous[ex.previous.length - 1];
  if (ex.type === 'timed') {
    return { amount: prev?.seconds ?? ex.targetSeconds ?? 30, weight: 0 };
  }
  return { amount: prev?.reps ?? ex.targetReps ?? 10, weight: prev?.weightKg ?? 0 };
}

export function formatSet(set: LoggedSet): string {
  if (set.seconds !== null) return `${set.seconds}s`;
  const reps = `${set.reps ?? 0} reps`;
  return set.weightKg !== null ? `${reps} × ${set.weightKg} kg` : reps;
}

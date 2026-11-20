import type { WorkoutItem } from './types';

const SECONDS_PER_REP = 3; // rough pace, only used for the time estimate

// Next id in a fixed rotation. Starts at the first one when nothing was done
// yet, or when the last session was not part of the rotation.
export function nextInRotation(orderedIds: number[], lastDoneId: number | null): number | null {
  if (orderedIds.length === 0) return null;
  const index = lastDoneId === null ? -1 : orderedIds.indexOf(lastDoneId);
  return orderedIds[(index + 1) % orderedIds.length];
}

export function estimateMinutes(items: WorkoutItem[]): number {
  const seconds = items.reduce((sum, item) => {
    const work =
      item.type === 'timed'
        ? (item.targetSeconds ?? 30)
        : (item.targetReps ?? 10) * SECONDS_PER_REP;
    return sum + item.targetSets * (work + item.restSeconds);
  }, 0);
  return Math.max(1, Math.round(seconds / 60));
}

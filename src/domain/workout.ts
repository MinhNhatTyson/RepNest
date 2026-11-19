import type { Exercise, WorkoutDraft, WorkoutItem } from './types';

export const DEFAULT_REST_SECONDS = 60;

let keyCounter = 0;

export function newItemKey(): string {
  keyCounter += 1;
  return `new-${keyCounter}`;
}

export function emptyDraft(): WorkoutDraft {
  return { id: null, name: '', items: [] };
}

export function createItem(exercise: Exercise): WorkoutItem {
  const timed = exercise.type === 'timed';
  return {
    key: newItemKey(),
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    type: exercise.type,
    targetSets: 3,
    targetReps: timed ? null : 10,
    targetSeconds: timed ? 30 : null,
    restSeconds: DEFAULT_REST_SECONDS,
  };
}

// Returns a new array with the element at `index` swapped with its neighbour.
export function moveItem<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) {
    return list;
  }
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

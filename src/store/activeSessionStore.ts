import { create } from 'zustand';
import type { ActiveSession, LoggedSet, PreviousSet, WorkoutDraft } from '../domain/types';

type ActiveSessionState = {
  session: ActiveSession | null;
  start: (workout: WorkoutDraft, previous: Record<number, PreviousSet[]>) => void;
  logSet: (exerciseKey: string, set: LoggedSet) => void;
  undoLastSet: (exerciseKey: string) => void;
  clear: () => void;
};

export const useActiveSessionStore = create<ActiveSessionState>((set) => ({
  session: null,

  start: (workout, previous) =>
    set({
      session: {
        workoutId: workout.id,
        name: workout.name,
        startedAt: Date.now(),
        exercises: workout.items.map((item) => ({
          key: item.key,
          exerciseId: item.exerciseId,
          exerciseName: item.exerciseName,
          type: item.type,
          targetSets: item.targetSets,
          targetReps: item.targetReps,
          targetSeconds: item.targetSeconds,
          restSeconds: item.restSeconds,
          previous: previous[item.exerciseId] ?? [],
          sets: [],
        })),
      },
    }),

  logSet: (exerciseKey, newSet) =>
    set((s) =>
      s.session
        ? {
            session: {
              ...s.session,
              exercises: s.session.exercises.map((ex) =>
                ex.key === exerciseKey ? { ...ex, sets: [...ex.sets, newSet] } : ex,
              ),
            },
          }
        : s,
    ),

  undoLastSet: (exerciseKey) =>
    set((s) =>
      s.session
        ? {
            session: {
              ...s.session,
              exercises: s.session.exercises.map((ex) =>
                ex.key === exerciseKey ? { ...ex, sets: ex.sets.slice(0, -1) } : ex,
              ),
            },
          }
        : s,
    ),

  clear: () => set({ session: null }),
}));

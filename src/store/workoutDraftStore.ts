import { create } from 'zustand';
import type { Exercise, WorkoutDraft, WorkoutItem } from '../domain/types';
import { createItem, emptyDraft, moveItem as moveInList } from '../domain/workout';

type ItemPatch = Partial<Omit<WorkoutItem, 'key'>>;

type WorkoutDraftState = {
  draft: WorkoutDraft;
  load: (draft: WorkoutDraft) => void;
  setName: (name: string) => void;
  addExercise: (exercise: Exercise) => void;
  updateItem: (key: string, patch: ItemPatch) => void;
  moveItem: (key: string, direction: -1 | 1) => void;
  removeItem: (key: string) => void;
};

export const useWorkoutDraftStore = create<WorkoutDraftState>((set) => ({
  draft: emptyDraft(),

  load: (draft) => set({ draft }),

  setName: (name) => set((s) => ({ draft: { ...s.draft, name } })),

  addExercise: (exercise) =>
    set((s) => ({ draft: { ...s.draft, items: [...s.draft.items, createItem(exercise)] } })),

  updateItem: (key, patch) =>
    set((s) => ({
      draft: {
        ...s.draft,
        items: s.draft.items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
      },
    })),

  moveItem: (key, direction) =>
    set((s) => {
      const index = s.draft.items.findIndex((item) => item.key === key);
      return { draft: { ...s.draft, items: moveInList(s.draft.items, index, direction) } };
    }),

  removeItem: (key) =>
    set((s) => ({ draft: { ...s.draft, items: s.draft.items.filter((i) => i.key !== key) } })),
}));

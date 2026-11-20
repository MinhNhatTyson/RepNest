// `amount` is reps for 'reps' exercises and seconds for 'timed' ones.
// Exercise names must match src/db/seed.ts exactly.
export type StarterItem = { exercise: string; sets: number; amount: number };

export type StarterWorkout = {
  name: string;
  restSeconds: number;
  items: StarterItem[];
};

export const STARTER_PROGRAM: StarterWorkout[] = [
  {
    name: 'Starter A',
    restSeconds: 45,
    items: [
      { exercise: 'Bodyweight squat', sets: 3, amount: 10 },
      { exercise: 'Incline push-up', sets: 3, amount: 8 },
      { exercise: 'Plank', sets: 3, amount: 20 },
    ],
  },
  {
    name: 'Starter B',
    restSeconds: 45,
    items: [
      { exercise: 'Glute bridge', sets: 3, amount: 12 },
      { exercise: 'Lunge', sets: 3, amount: 8 },
      { exercise: 'Dead bug', sets: 3, amount: 8 },
    ],
  },
  {
    name: 'Starter C',
    restSeconds: 45,
    items: [
      { exercise: 'Superman', sets: 3, amount: 10 },
      { exercise: 'Wall sit', sets: 3, amount: 20 },
      { exercise: 'Mountain climber', sets: 3, amount: 20 },
    ],
  },
];

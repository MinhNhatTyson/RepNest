export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Core',
  'Legs',
  'Glutes',
  'Full body',
] as const;

export const EQUIPMENT = [
  'Bodyweight',
  'Dumbbells',
  'Resistance band',
  'Pull-up bar',
  'Kettlebell',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type Equipment = (typeof EQUIPMENT)[number];
export type ExerciseType = 'reps' | 'timed';

export type Exercise = {
  id: number;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  type: ExerciseType;
  instructions: string;
  isCustom: boolean;
};
export type WorkoutSummary = {
  id: number;
  name: string;
  exerciseCount: number;
};

export type WorkoutItem = {
  key: string; // stable React key; not stored in the DB
  exerciseId: number;
  exerciseName: string;
  type: ExerciseType;
  targetSets: number;
  targetReps: number | null; // set when type is 'reps'
  targetSeconds: number | null; // set when type is 'timed'
  restSeconds: number;
};

// `id` is null until the workout is saved for the first time.
export type WorkoutDraft = {
  id: number | null;
  name: string;
  items: WorkoutItem[];
};

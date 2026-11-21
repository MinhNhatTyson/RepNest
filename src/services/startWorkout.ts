import { Alert } from 'react-native';
import { router } from 'expo-router';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getPreviousSets } from '../db/sessionRepository';
import { getWorkoutForStart } from '../db/programRepository';
import type { PreviousSet } from '../domain/types';
import { useActiveSessionStore } from '../store/activeSessionStore';

export async function startWorkout(db: SQLiteDatabase, workoutId: number): Promise<void> {
  async function begin() {
    const loaded = await getWorkoutForStart(db, workoutId);
    if (!loaded || loaded.workout.items.length === 0) return;
    const { workout, program } = loaded;
    // The 5-minute version always uses its own small targets, never last session's numbers.
    const previous: Record<number, PreviousSet[]> =
      program === 'lite'
        ? {}
        : await getPreviousSets(
            db,
            workout.items.map((i) => i.exerciseId),
          );
    useActiveSessionStore.getState().start(workout, previous);
    router.push('/session/guided');
  }

  if (useActiveSessionStore.getState().session) {
    Alert.alert('Workout in progress', 'Resume it, or discard it and start this one?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resume', onPress: () => router.push('/session/guided') },
      { text: 'Start new', style: 'destructive', onPress: begin },
    ]);
    return;
  }
  await begin();
}

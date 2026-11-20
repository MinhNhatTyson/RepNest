import { Alert } from 'react-native';
import { router } from 'expo-router';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getPreviousSets } from '../db/sessionRepository';
import { getWorkout } from '../db/workoutRepository';
import { useActiveSessionStore } from '../store/activeSessionStore';

export async function startWorkout(db: SQLiteDatabase, workoutId: number): Promise<void> {
  async function begin() {
    const workout = await getWorkout(db, workoutId);
    if (!workout || workout.items.length === 0) return;
    const previous = await getPreviousSets(
      db,
      workout.items.map((i) => i.exerciseId),
    );
    useActiveSessionStore.getState().start(workout, previous);
    router.push('/session/active');
  }

  if (useActiveSessionStore.getState().session) {
    Alert.alert('Workout in progress', 'Resume it, or discard it and start this one?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resume', onPress: () => router.push('/session/active') },
      { text: 'Start new', style: 'destructive', onPress: begin },
    ]);
    return;
  }
  await begin();
}

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { getExerciseById } from '../../db/exerciseRepository';
import type { Exercise } from '../../domain/types';
import { colors, spacing } from '../../theme';

export default function ExerciseDetailScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let cancelled = false;
    getExerciseById(db, Number(id)).then((row) => {
      if (!cancelled) setExercise(row);
    });
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  if (!exercise) {
    return <View style={styles.container} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
    >
      <AppText variant="title">{exercise.name}</AppText>
      <AppText tone="muted">
        {exercise.muscleGroup} · {exercise.equipment} ·{' '}
        {exercise.type === 'timed' ? 'Timed' : 'Reps'}
      </AppText>
      <Card>
        <AppText variant="label" tone="primary">
          HOW TO
        </AppText>
        <AppText>{exercise.instructions}</AppText>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
});

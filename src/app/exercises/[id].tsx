import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { getExerciseById } from '../../db/exerciseRepository';
import type { Exercise } from '../../domain/types';
import { colors, spacing, typography } from '../../theme';

export default function ExerciseDetailScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{exercise.name}</Text>
      <Text style={styles.meta}>
        {exercise.muscleGroup} · {exercise.equipment} ·{' '}
        {exercise.type === 'timed' ? 'Timed' : 'Reps'}
      </Text>
      <Text style={styles.sectionLabel}>How to</Text>
      <Text style={styles.body}>{exercise.instructions}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm },
  title: { ...typography.title, color: colors.text },
  meta: { ...typography.body, color: colors.textMuted },
  sectionLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.lg,
  },
  body: { ...typography.body, color: colors.text, lineHeight: 24 },
});

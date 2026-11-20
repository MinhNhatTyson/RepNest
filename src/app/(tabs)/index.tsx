import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getNextStarterWorkoutId } from '../../db/programRepository';
import { getWorkout } from '../../db/workoutRepository';
import { estimateMinutes } from '../../domain/program';
import type { WorkoutDraft } from '../../domain/types';
import { startWorkout } from '../../services/startWorkout';
import { useActiveSessionStore } from '../../store/activeSessionStore';
import { colors, minTapTarget, radius, spacing, typography } from '../../theme';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const activeSession = useActiveSessionStore((s) => s.session);
  const [workout, setWorkout] = useState<WorkoutDraft | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Reload on every focus so the rotation advances after a finished session.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        const id = await getNextStarterWorkoutId(db);
        const next = id === null ? null : await getWorkout(db, id);
        if (!cancelled) {
          setWorkout(next);
          setLoaded(true);
        }
      }
      load();
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Today</Text>

        {activeSession ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>IN PROGRESS</Text>
              <Text style={styles.cardTitle}>{activeSession.name}</Text>
            </View>
            <Pressable style={styles.startButton} onPress={() => router.push('/session/guided')}>
              <Text style={styles.startText}>Resume workout</Text>
            </Pressable>
          </>
        ) : workout ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>UP NEXT</Text>
              <Text style={styles.cardTitle}>{workout.name}</Text>
              <Text style={styles.cardMeta}>
                {workout.items.length} exercises · about {estimateMinutes(workout.items)} min
              </Text>
              <Text style={styles.cardExercises}>
                {workout.items.map((item) => item.exerciseName).join(' · ')}
              </Text>
            </View>
            <Pressable style={styles.startButton} onPress={() => startWorkout(db, workout.id ?? 0)}>
              <Text style={styles.startText}>Start today workout</Text>
            </Pressable>
          </>
        ) : (
          loaded && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No starter workout found</Text>
              <Text style={styles.cardMeta}>You can build one in the Workouts tab.</Text>
              <Link href="/workouts" style={styles.link}>
                Open Workouts
              </Link>
            </View>
          )
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg, gap: spacing.md },
  title: { ...typography.title, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardLabel: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  cardTitle: { ...typography.title, color: colors.text },
  cardMeta: { ...typography.body, color: colors.textMuted },
  cardExercises: { ...typography.caption, color: colors.textMuted, lineHeight: 20 },
  startButton: {
    minHeight: minTapTarget + 16,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: { ...typography.body, fontSize: 20, color: colors.onPrimary, fontWeight: '800' },
  link: { ...typography.body, color: colors.primary, fontWeight: '700' },
});

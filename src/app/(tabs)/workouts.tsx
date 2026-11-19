import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteWorkout, duplicateWorkout, listWorkouts } from '../../db/workoutRepository';
import type { WorkoutSummary } from '../../domain/types';
import { colors, minTapTarget, radius, spacing, typography } from '../../theme';

export default function WorkoutsScreen() {
  const db = useSQLiteContext();
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);

  const refresh = useCallback(async () => {
    setWorkouts(await listWorkouts(db));
  }, [db]);

  // Reload every time this tab regains focus (e.g. after saving in the editor).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  function confirmDelete(workout: WorkoutSummary) {
    Alert.alert('Delete workout?', workout.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteWorkout(db, workout.id);
          await refresh();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Workouts</Text>
        <Link href={{ pathname: '/workout/[id]', params: { id: 'new' } }} asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>New workout</Text>
          </Pressable>
        </Link>
        <Link href="/exercises" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Exercise library</Text>
          </Pressable>
        </Link>
      </View>

      <FlatList
        data={workouts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No workouts yet. Create your first one above.</Text>
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: '/workout/[id]', params: { id: String(item.id) } }} asChild>
            <Pressable style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.exerciseCount} {item.exerciseCount === 1 ? 'exercise' : 'exercises'}
                </Text>
              </View>
              <Pressable
                style={styles.iconButton}
                onPress={() => duplicateWorkout(db, item.id).then(refresh)}
                accessibilityLabel="Duplicate workout"
              >
                <Ionicons name="copy-outline" size={22} color={colors.textMuted} />
              </Pressable>
              <Pressable
                style={styles.iconButton}
                onPress={() => confirmDelete(item)}
                accessibilityLabel="Delete workout"
              >
                <Ionicons name="trash-outline" size={22} color={colors.textMuted} />
              </Pressable>
            </Pressable>
          </Link>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, gap: spacing.sm },
  title: { ...typography.title, color: colors.text },
  primaryButton: {
    marginTop: spacing.sm,
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  primaryButtonText: { ...typography.body, color: colors.onPrimary, fontWeight: '700' },
  secondaryButton: {
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: { ...typography.body, color: colors.text, fontWeight: '600' },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  row: {
    minHeight: minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowText: { flex: 1, gap: 2 },
  name: { ...typography.body, color: colors.text, fontWeight: '600' },
  meta: { ...typography.caption, color: colors.textMuted },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});

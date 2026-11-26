import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { IconButton } from '../../components/ui/IconButton';
import { Screen } from '../../components/ui/Screen';
import { deleteWorkout, duplicateWorkout, listWorkouts } from '../../db/workoutRepository';
import type { WorkoutSummary } from '../../domain/types';
import { startWorkout } from '../../services/startWorkout';
import { colors, radius, spacing } from '../../theme';

const PROGRAM_LABEL: Record<string, string> = {
  starter: 'STARTER PROGRAM',
  lite: 'QUICK SESSION',
};

export default function WorkoutsScreen() {
  const db = useSQLiteContext();
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    setWorkouts(await listWorkouts(db));
    setLoaded(true);
  }, [db]);

  // Reload every time this tab regains focus (e.g. after saving in the editor).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  function confirmDelete(workout: WorkoutSummary) {
    Alert.alert(
      'Delete workout?',
      `"${workout.name}" will be removed. Your past sessions stay in History.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteWorkout(db, workout.id);
            await refresh();
          },
        },
      ],
    );
  }

  function openMenu(workout: WorkoutSummary) {
    const duplicate = {
      text: 'Duplicate',
      onPress: () => {
        duplicateWorkout(db, workout.id).then(refresh);
      },
    };
    const cancel = { text: 'Cancel', style: 'cancel' as const };

    if (workout.program !== null) {
      // Built-in workouts power Today and the 5-minute button, so they stay.
      Alert.alert(workout.name, 'Part of your program, so it cannot be deleted.', [
        duplicate,
        cancel,
      ]);
      return;
    }
    Alert.alert(workout.name, undefined, [
      duplicate,
      { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(workout) },
      cancel,
    ]);
  }

  const headerActions = (
    <View style={styles.headerActions}>
      <IconButton
        icon="library-outline"
        label="Exercise library"
        onPress={() => router.push('/exercises')}
      />
      <IconButton
        icon="add"
        label="New workout"
        tone="primary"
        onPress={() => router.push({ pathname: '/workout/[id]', params: { id: 'new' } })}
      />
    </View>
  );

  return (
    <Screen title="Workouts" right={headerActions}>
      <FlatList
        data={workouts}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loaded ? (
            <Card variant="quiet">
              <AppText variant="heading">No workouts yet</AppText>
              <AppText tone="muted">Build your first one, it takes a minute.</AppText>
              <Button
                variant="secondary"
                size="md"
                label="New workout"
                onPress={() => router.push({ pathname: '/workout/[id]', params: { id: 'new' } })}
              />
            </Card>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() =>
              router.push({ pathname: '/workout/[id]', params: { id: String(item.id) } })
            }
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.name}`}
          >
            <View style={styles.rowText}>
              {item.program && PROGRAM_LABEL[item.program] ? (
                <AppText variant="label" tone="faint">
                  {PROGRAM_LABEL[item.program]}
                </AppText>
              ) : null}
              <AppText variant="heading" numberOfLines={1}>
                {item.name}
              </AppText>
              <AppText variant="caption" tone="muted">
                {item.exerciseCount} {item.exerciseCount === 1 ? 'exercise' : 'exercises'}
              </AppText>
            </View>
            <IconButton
              icon="play"
              label={`Start ${item.name}`}
              tone="primary"
              onPress={() => startWorkout(db, item.id)}
            />
            <IconButton
              icon="ellipsis-horizontal"
              label={`More options for ${item.name}`}
              onPress={() => openMenu(item)}
            />
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  list: { flex: 1 },
  listContent: { gap: spacing.sm, paddingBottom: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
  },
  rowPressed: { opacity: 0.85 },
  rowText: { flex: 1, gap: 2 },
});

import { useEffect, useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { WorkoutItemCard } from '../../components/WorkoutItemCard';
import { getWorkout, saveWorkout } from '../../db/workoutRepository';
import { emptyDraft } from '../../domain/workout';
import { useWorkoutDraftStore } from '../../store/workoutDraftStore';
import { colors, minTapTarget, radius, spacing } from '../../theme';

export default function WorkoutEditorScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const draft = useWorkoutDraftStore((s) => s.draft);
  const load = useWorkoutDraftStore((s) => s.load);
  const setName = useWorkoutDraftStore((s) => s.setName);
  const updateItem = useWorkoutDraftStore((s) => s.updateItem);
  const moveItem = useWorkoutDraftStore((s) => s.moveItem);
  const removeItem = useWorkoutDraftStore((s) => s.removeItem);

  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const loaded = isNew ? emptyDraft() : await getWorkout(db, Number(id));
      if (cancelled) return;
      if (loaded) {
        load(loaded);
        setReady(true);
      } else {
        router.back();
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [db, id, isNew, load]);

  const canSave = draft.name.trim().length > 0 && draft.items.length > 0 && !saving;

  async function onSave() {
    setSaving(true);
    try {
      await saveWorkout(db, draft);
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Could not save the workout');
    }
  }

  return (
    <Screen
      scroll
      edges={['bottom']}
      footer={<Button label="Save workout" disabled={!canSave} onPress={onSave} />}
    >
      <Stack.Screen options={{ title: isNew ? 'New workout' : 'Edit workout' }} />

      {ready ? (
        <>
          <TextInput
            style={styles.nameInput}
            value={draft.name}
            onChangeText={setName}
            placeholder="Workout name"
            placeholderTextColor={colors.textMuted}
          />

          {draft.items.length === 0 ? (
            <AppText tone="muted">Add your first exercise to get going.</AppText>
          ) : null}

          {draft.items.map((item, index) => (
            <WorkoutItemCard
              key={item.key}
              item={item}
              isFirst={index === 0}
              isLast={index === draft.items.length - 1}
              onChange={(patch) => updateItem(item.key, patch)}
              onMove={(direction) => moveItem(item.key, direction)}
              onRemove={() => removeItem(item.key)}
            />
          ))}

          <Button
            variant="secondary"
            size="md"
            icon="add"
            label="Add exercise"
            onPress={() => router.push('/workout/pick-exercise')}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  nameInput: {
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: minTapTarget,
  },
});

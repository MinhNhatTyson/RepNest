import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WorkoutItemCard } from '../../components/WorkoutItemCard';
import { getWorkout, saveWorkout } from '../../db/workoutRepository';
import { emptyDraft } from '../../domain/workout';
import { useWorkoutDraftStore } from '../../store/workoutDraftStore';
import { colors, minTapTarget, radius, spacing, typography } from '../../theme';

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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: isNew ? 'New workout' : 'Edit workout' }} />

      {ready && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.nameInput}
            value={draft.name}
            onChangeText={setName}
            placeholder="Workout name"
            placeholderTextColor={colors.textMuted}
          />

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

          <Link href="/workout/pick-exercise" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>+ Add exercise</Text>
            </Pressable>
          </Link>
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Pressable
          style={[styles.primaryButton, !canSave && styles.disabled]}
          disabled={!canSave}
          onPress={onSave}
        >
          <Text style={styles.primaryButtonText}>Save workout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  nameInput: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: minTapTarget,
  },
  secondaryButton: {
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: { ...typography.body, color: colors.primary, fontWeight: '700' },
  footer: { padding: spacing.md },
  primaryButton: {
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryButtonText: { ...typography.body, color: colors.onPrimary, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});

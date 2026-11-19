import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActiveExerciseCard } from '../../components/ActiveExerciseCard';
import { saveSession } from '../../db/sessionRepository';
import { useActiveSessionStore } from '../../store/activeSessionStore';
import { colors, minTapTarget, radius, spacing, typography } from '../../theme';

export default function ActiveSessionScreen() {
  const db = useSQLiteContext();
  const session = useActiveSessionStore((s) => s.session);
  const logSet = useActiveSessionStore((s) => s.logSet);
  const undoLastSet = useActiveSessionStore((s) => s.undoLastSet);
  const clear = useActiveSessionStore((s) => s.clear);
  const [saving, setSaving] = useState(false);

  // Session was cleared (finished/discarded) while the screen is closing.
  if (!session) {
    return <View style={styles.container} />;
  }

  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const canFinish = totalSets > 0 && !saving;

  async function onFinish() {
    if (!session) return;
    setSaving(true);
    try {
      await saveSession(db, session);
      clear();
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Could not save the workout');
    }
  }

  function onDiscard() {
    Alert.alert('Discard workout?', 'All sets logged so far will be lost.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          clear();
          router.back();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ gestureEnabled: false }} />

      <View style={styles.topBar}>
        <Text style={styles.title} numberOfLines={1}>
          {session.name}
        </Text>
        <Pressable style={styles.discardButton} onPress={onDiscard}>
          <Text style={styles.discardText}>Discard</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {session.exercises.map((exercise) => (
          <ActiveExerciseCard
            key={exercise.key}
            exercise={exercise}
            onLog={(set) => logSet(exercise.key, set)}
            onUndo={() => undoLastSet(exercise.key)}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.finishButton, !canFinish && styles.disabled]}
          disabled={!canFinish}
          onPress={onFinish}
        >
          <Text style={styles.finishText}>Finish workout · {totalSets} sets</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  title: { ...typography.title, color: colors.text, flex: 1 },
  discardButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  discardText: { ...typography.body, color: colors.textMuted },
  content: { padding: spacing.md, gap: spacing.md },
  footer: { padding: spacing.md },
  finishButton: {
    minHeight: minTapTarget + 8,
    borderRadius: radius.md,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishText: { ...typography.body, fontSize: 18, color: colors.onPrimary, fontWeight: '800' },
  disabled: { opacity: 0.4 },
});

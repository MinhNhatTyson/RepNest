import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ActiveExerciseCard } from '../../components/ActiveExerciseCard';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { saveSession } from '../../db/sessionRepository';
import { useActiveSessionStore } from '../../store/activeSessionStore';
import { colors, spacing } from '../../theme';

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
    <Screen
      scroll
      edges={['top', 'bottom']}
      title={session.name}
      right={
        <>
          <Pressable
            style={styles.topButton}
            onPress={() => router.replace('/session/guided')}
            accessibilityRole="button"
          >
            <AppText tone="muted">Guided</AppText>
          </Pressable>
          <Pressable style={styles.topButton} onPress={onDiscard} accessibilityRole="button">
            <AppText tone="muted">Discard</AppText>
          </Pressable>
        </>
      }
      footer={
        <Button
          label={`Finish workout · ${totalSets} sets`}
          icon="checkmark"
          disabled={!canFinish}
          onPress={onFinish}
        />
      }
    >
      <Stack.Screen options={{ gestureEnabled: false }} />

      {session.exercises.map((exercise) => (
        <ActiveExerciseCard
          key={exercise.key}
          exercise={exercise}
          onLog={(set) => logSet(exercise.key, set)}
          onUndo={() => undoLastSet(exercise.key)}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
});

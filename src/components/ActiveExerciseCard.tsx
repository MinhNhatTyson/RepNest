import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigStepper } from './BigStepper';
import { formatSet, suggestSet } from '../domain/session';
import type { ActiveExercise, LoggedSet } from '../domain/types';
import { colors, radius, spacing, typography } from '../theme';

type Props = {
  exercise: ActiveExercise;
  onLog: (set: LoggedSet) => void;
  onUndo: () => void;
};

export function ActiveExerciseCard({ exercise, onLog, onUndo }: Props) {
  const timed = exercise.type === 'timed';
  const doneCount = exercise.sets.length;
  const targetReached = doneCount >= exercise.targetSets;
  const [input, setInput] = useState(() => suggestSet(exercise, 0));

  function handleLog() {
    onLog({
      reps: timed ? null : input.amount,
      seconds: timed ? input.amount : null,
      weightKg: !timed && input.weight > 0 ? input.weight : null,
      completedAt: Date.now(),
    });
    // Only re-prefill if last session had a value for the next set; otherwise
    // keep what the user just entered (most people repeat the same numbers).
    if (exercise.previous[doneCount + 1]) {
      setInput(suggestSet(exercise, doneCount + 1));
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={2}>
          {exercise.exerciseName}
        </Text>
        <Text style={[styles.progress, targetReached && styles.progressDone]}>
          {doneCount}/{exercise.targetSets}
        </Text>
      </View>

      {exercise.sets.map((set, index) => (
        <View key={set.completedAt} style={styles.loggedRow}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.loggedText}>
            Set {index + 1} · {formatSet(set)}
          </Text>
        </View>
      ))}

      <BigStepper
        label={timed ? 'Duration' : 'Reps'}
        value={input.amount}
        step={timed ? 5 : 1}
        min={1}
        unit={timed ? 's' : ''}
        onChange={(amount) => setInput((i) => ({ ...i, amount }))}
      />
      {!timed && (
        <BigStepper
          label="Weight (0 = bodyweight)"
          value={input.weight}
          step={2.5}
          min={0}
          unit="kg"
          onChange={(weight) => setInput((i) => ({ ...i, weight }))}
        />
      )}

      <Pressable style={styles.logButton} onPress={handleLog}>
        <Text style={styles.logButtonText}>
          {targetReached ? `Log extra set ${doneCount + 1}` : `Log set ${doneCount + 1}`}
        </Text>
      </Pressable>

      {doneCount > 0 && (
        <Pressable style={styles.undoButton} onPress={onUndo}>
          <Text style={styles.undoText}>Undo last set</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.title, fontSize: 22, color: colors.text, flex: 1 },
  progress: { ...typography.body, color: colors.textMuted, fontWeight: '700' },
  progressDone: { color: colors.success },
  loggedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loggedText: { ...typography.body, color: colors.textMuted },
  logButton: {
    minHeight: 64,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonText: { ...typography.body, fontSize: 18, color: colors.onPrimary, fontWeight: '800' },
  undoButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  undoText: { ...typography.caption, color: colors.textMuted },
});

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './ui/AppText';
import { BigStepper } from './BigStepper';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { formatSet, suggestSet } from '../domain/session';
import type { ActiveExercise, LoggedSet } from '../domain/types';
import { colors, spacing } from '../theme';

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
    <Card style={styles.card}>
      <View style={styles.header}>
        <AppText variant="heading" numberOfLines={2} style={styles.name}>
          {exercise.exerciseName}
        </AppText>
        <AppText variant="bodyStrong" tone={targetReached ? 'success' : 'muted'}>
          {doneCount}/{exercise.targetSets}
        </AppText>
      </View>

      {exercise.sets.map((set, index) => (
        <View key={set.completedAt} style={styles.loggedRow}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <AppText tone="muted">
            Set {index + 1} · {formatSet(set)}
          </AppText>
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

      <Button
        label={targetReached ? `Log extra set ${doneCount + 1}` : `Log set ${doneCount + 1}`}
        onPress={handleLog}
      />

      {doneCount > 0 ? (
        <Button variant="quiet" size="md" label="Undo last set" onPress={onUndo} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1 },
  loggedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});

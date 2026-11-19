import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stepper } from './Stepper';
import type { WorkoutItem } from '../domain/types';
import { colors, radius, spacing, typography } from '../theme';

type Props = {
  item: WorkoutItem;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<Omit<WorkoutItem, 'key'>>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
};

export function WorkoutItemCard({ item, isFirst, isLast, onChange, onMove, onRemove }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={2}>
          {item.exerciseName}
        </Text>
        <Pressable
          style={[styles.iconButton, isFirst && styles.disabled]}
          disabled={isFirst}
          onPress={() => onMove(-1)}
          accessibilityLabel="Move up"
        >
          <Ionicons name="chevron-up" size={22} color={colors.text} />
        </Pressable>
        <Pressable
          style={[styles.iconButton, isLast && styles.disabled]}
          disabled={isLast}
          onPress={() => onMove(1)}
          accessibilityLabel="Move down"
        >
          <Ionicons name="chevron-down" size={22} color={colors.text} />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={onRemove} accessibilityLabel="Remove">
          <Ionicons name="trash-outline" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <Stepper
        label="Sets"
        value={item.targetSets}
        step={1}
        min={1}
        onChange={(targetSets) => onChange({ targetSets })}
      />
      {item.type === 'timed' ? (
        <Stepper
          label="Duration"
          value={item.targetSeconds ?? 30}
          step={5}
          min={5}
          unit="s"
          onChange={(targetSeconds) => onChange({ targetSeconds })}
        />
      ) : (
        <Stepper
          label="Reps"
          value={item.targetReps ?? 10}
          step={1}
          min={1}
          onChange={(targetReps) => onChange({ targetReps })}
        />
      )}
      <Stepper
        label="Rest"
        value={item.restSeconds}
        step={15}
        min={0}
        unit="s"
        onChange={(restSeconds) => onChange({ restSeconds })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { ...typography.body, color: colors.text, fontWeight: '700', flex: 1 },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.3 },
});

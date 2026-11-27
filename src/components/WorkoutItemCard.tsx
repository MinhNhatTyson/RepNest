import { StyleSheet, View } from 'react-native';
import { AppText } from './ui/AppText';
import { Card } from './ui/Card';
import { IconButton } from './ui/IconButton';
import { Stepper } from './Stepper';
import type { WorkoutItem } from '../domain/types';
import { spacing } from '../theme';

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
    <Card>
      <View style={styles.header}>
        <AppText variant="heading" numberOfLines={2} style={styles.name}>
          {item.exerciseName}
        </AppText>
        <IconButton
          icon="chevron-up"
          label="Move up"
          disabled={isFirst}
          onPress={() => onMove(-1)}
        />
        <IconButton
          icon="chevron-down"
          label="Move down"
          disabled={isLast}
          onPress={() => onMove(1)}
        />
        <IconButton icon="trash-outline" label="Remove" onPress={onRemove} />
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
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { flex: 1 },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, minTapTarget, radius, spacing, typography } from '../theme';

type Props = {
  label: string;
  value: number;
  step: number;
  min: number;
  unit?: string;
  onChange: (value: number) => void;
};

const round = (n: number) => Math.round(n * 100) / 100; // avoids 0.1 + 0.2 style drift

export function BigStepper({ label, value, step, min, unit = '', onChange }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          style={styles.button}
          onPress={() => onChange(Math.max(min, round(value - step)))}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Ionicons name="remove" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.value}>
          {value}
          <Text style={styles.unit}>{unit ? ` ${unit}` : ''}</Text>
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => onChange(round(value + step))}
          accessibilityLabel={`Increase ${label}`}
        >
          <Ionicons name="add" size={28} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  button: {
    width: minTapTarget,
    height: minTapTarget,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    ...typography.bigNumber,
    fontSize: 44,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  unit: { ...typography.body, color: colors.textMuted },
});

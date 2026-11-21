import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

type Props = {
  label: string;
  value: number;
  step: number;
  min: number;
  unit?: string;
  onChange: (value: number) => void;
  format?: (value: number) => string;
};

export function Stepper({ label, value, step, min, unit = '', format, onChange }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <Pressable
          style={styles.button}
          onPress={() => onChange(Math.max(min, value - step))}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Ionicons name="remove" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.value}>{format ? format(value) : `${value}${unit}`}</Text>
        <Pressable
          style={styles.button}
          onPress={() => onChange(value + step)}
          accessibilityLabel={`Increase ${label}`}
        >
          <Ionicons name="add" size={22} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { ...typography.body, color: colors.textMuted },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    minWidth: 56,
    textAlign: 'center',
  },
});

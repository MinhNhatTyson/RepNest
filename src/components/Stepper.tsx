import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './ui/AppText';
import { colors, radius, spacing } from '../theme';

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
      <AppText tone="muted">{label}</AppText>
      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={() => onChange(Math.max(min, value - step))}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
        >
          <Ionicons name="remove" size={22} color={colors.text} />
        </Pressable>
        <AppText variant="bodyStrong" style={styles.value}>
          {format ? format(value) : `${value}${unit}`}
        </AppText>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={() => onChange(value + step)}
          accessibilityRole="button"
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
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  button: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.95 }] },
  value: { minWidth: 56, textAlign: 'center' },
});

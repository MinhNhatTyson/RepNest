import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './ui/AppText';
import { colors, minTapTarget, radius, spacing } from '../theme';

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
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={() => onChange(Math.max(min, round(value - step)))}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
        >
          <Ionicons name="remove" size={28} color={colors.text} />
        </Pressable>
        <AppText variant="hero" style={styles.value}>
          {value}
          <AppText variant="heading" tone="muted">
            {unit ? ` ${unit}` : ''}
          </AppText>
        </AppText>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={() => onChange(round(value + step))}
          accessibilityRole="button"
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  button: {
    width: minTapTarget,
    height: minTapTarget,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.95 }] },
  value: { flex: 1, textAlign: 'center' },
});

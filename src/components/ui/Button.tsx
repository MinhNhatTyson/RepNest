import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, minTapTarget, radius, spacing } from '../../theme';

type Variant = 'primary' | 'secondary' | 'quiet';
type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: 'lg' | 'md';
  icon?: ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const look: Record<Variant, { container: ViewStyle; color: string }> = {
  primary: { container: { backgroundColor: colors.primary }, color: colors.onPrimary },
  secondary: {
    container: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    color: colors.text,
  },
  quiet: { container: { backgroundColor: 'transparent' }, color: colors.textMuted },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  disabled = false,
  style,
}: Props) {
  const { container, color } = look[variant];
  const large = size === 'lg' && variant !== 'quiet';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        large ? styles.lg : styles.md,
        container,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={large ? 26 : 22} color={color} /> : null}
      <AppText variant={large ? 'heading' : 'bodyStrong'} style={{ color }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
  },
  lg: { minHeight: minTapTarget + 16 },
  md: { minHeight: minTapTarget },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4 },
});

import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string; // accessibility label
  onPress: () => void;
  tone?: 'default' | 'primary';
  size?: number;
  disabled?: boolean;
};

export function IconButton({
  icon,
  label,
  onPress,
  tone = 'default',
  size = 48,
  disabled = false,
}: Props) {
  const primary = tone === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        primary ? styles.primary : styles.default,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name={icon} size={size * 0.5} color={primary ? colors.primary : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  default: { backgroundColor: colors.surfaceRaised },
  primary: { backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.8, transform: [{ scale: 0.95 }] },
  disabled: { opacity: 0.3 },
});

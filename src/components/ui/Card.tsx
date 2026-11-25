import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../../theme';

type Props = {
  variant?: 'default' | 'hero' | 'quiet';
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

// default = a normal block, hero = the one thing the screen is about, quiet = secondary.
export function Card({ variant = 'default', style, children }: Props) {
  return <View style={[styles.base, styles[variant], style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  default: { backgroundColor: colors.surface, borderColor: colors.border },
  hero: {
    backgroundColor: colors.surface,
    borderColor: colors.primaryBorder,
    padding: spacing.lg,
    gap: spacing.md,
  },
  quiet: { backgroundColor: 'transparent', borderColor: colors.border },
});

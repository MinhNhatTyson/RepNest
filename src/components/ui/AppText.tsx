import { Text, type TextProps } from 'react-native';
import { colors, textStyle } from '../../theme';

type Tone = 'text' | 'muted' | 'faint' | 'primary' | 'success' | 'onPrimary';

const toneColor: Record<Tone, string> = {
  text: colors.text,
  muted: colors.textMuted,
  faint: colors.textFaint,
  primary: colors.primary,
  success: colors.success,
  onPrimary: colors.onPrimary,
};

type Props = TextProps & { variant?: keyof typeof textStyle; tone?: Tone };

export function AppText({ variant = 'body', tone = 'text', style, ...rest }: Props) {
  return <Text {...rest} style={[textStyle[variant], { color: toneColor[tone] }, style]} />;
}

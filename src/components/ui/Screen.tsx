import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { colors, spacing } from '../../theme';

type Props = {
  title?: string;
  right?: ReactNode; // e.g. a settings icon button
  footer?: ReactNode; // pinned to the bottom, outside the scroll area
  scroll?: boolean;
  edges?: Edge[];
  children: ReactNode;
};

export function Screen({ title, right, footer, scroll = false, edges = ['top'], children }: Props) {
  const header =
    title || right ? (
      <View style={styles.header}>
        <AppText variant="title" style={styles.title}>
          {title}
        </AppText>
        {right}
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>
          {header}
          {children}
        </View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
});

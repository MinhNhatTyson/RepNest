import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { exportBackup } from '../services/exportBackup';
import { colors, minTapTarget, radius, spacing, typography } from '../theme';

export function BackupCard() {
  const db = useSQLiteContext();
  const [busy, setBusy] = useState(false);

  async function onBackup() {
    setBusy(true);
    try {
      const result = await exportBackup(db);
      if (result === 'unavailable') Alert.alert('Sharing is not available on this device');
    } catch {
      Alert.alert('Could not create the backup');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Backup</Text>
      <Text style={styles.muted}>
        Save a copy of your sessions and settings. Keep it somewhere safe, like your Drive.
      </Text>
      <Pressable
        style={[styles.button, busy && styles.disabled]}
        disabled={busy}
        onPress={onBackup}
      >
        <Text style={styles.buttonText}>Back up my data</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: { ...typography.body, color: colors.text, fontWeight: '700' },
  muted: { ...typography.body, color: colors.textMuted },
  button: {
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: { ...typography.body, color: colors.text, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});

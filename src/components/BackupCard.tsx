import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { exportBackup } from '../services/exportBackup';
import { colors, minTapTarget, radius, spacing, typography } from '../theme';
import { applyBackup, pickBackup } from '../services/restoreBackup';
import { summarizeBackup, type Backup } from '../domain/backup';
import { useActiveSessionStore } from '../store/activeSessionStore';

type Props = { onRestored?: () => void };

export function BackupCard({ onRestored }: Props) {
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
  async function onRestore() {
    if (useActiveSessionStore.getState().session) {
      Alert.alert('Workout in progress', 'Finish or quit your workout, then restore.');
      return;
    }
    setBusy(true);
    try {
      const picked = await pickBackup();
      if (picked.status === 'invalid') Alert.alert('Could not restore', picked.reason);
      if (picked.status === 'ready') confirmRestore(picked.backup);
    } catch {
      Alert.alert('Could not read the file');
    } finally {
      setBusy(false);
    }
  }
  function confirmRestore(backup: Backup) {
    const s = summarizeBackup(backup);
    const saved = new Date(backup.exportedAt).toLocaleDateString();
    Alert.alert(
      'Replace your data?',
      `Backup from ${saved}: ${s.sessions} sessions, ${s.workouts} workouts. Everything in the app right now will be replaced.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: () => runRestore(backup) },
      ],
    );
  }

  async function runRestore(backup: Backup) {
    setBusy(true);
    try {
      const { remindersReady } = await applyBackup(db, backup);
      onRestored?.();
      Alert.alert(
        'Backup restored',
        remindersReady
          ? 'Your sessions and settings are back.'
          : 'Your sessions and settings are back. Open Reminders above and tap Save to turn your reminders on.',
      );
    } catch {
      Alert.alert('Could not restore', 'Nothing was changed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Backup</Text>
      <Text style={styles.muted}>
        Save a copy of your sessions and settings. Keep it somewhere safe, like your Drive. Restore
        brings a saved copy back, for example on a new phone.
      </Text>
      <Pressable
        style={[styles.button, busy && styles.disabled]}
        disabled={busy}
        onPress={onBackup}
      >
        <Text style={styles.buttonText}>Back up my data</Text>
      </Pressable>
      <Pressable
        style={[styles.button, busy && styles.disabled]}
        disabled={busy}
        onPress={onRestore}
      >
        <Text style={styles.buttonText}>Restore from a backup</Text>
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

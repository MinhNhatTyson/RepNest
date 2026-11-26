import { useState } from 'react';
import { Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { summarizeBackup, type Backup } from '../domain/backup';
import { exportBackup } from '../services/exportBackup';
import { applyBackup, pickBackup } from '../services/restoreBackup';
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
    <Card>
      <AppText variant="heading">Backup</AppText>
      <AppText tone="muted">
        Save a copy of your sessions and settings. Keep it somewhere safe, like your Drive. Restore
        brings a saved copy back, for example on a new phone.
      </AppText>
      <Button
        variant="secondary"
        size="md"
        label="Back up my data"
        icon="cloud-upload-outline"
        disabled={busy}
        onPress={onBackup}
      />
      <Button
        variant="secondary"
        size="md"
        label="Restore from a backup"
        icon="cloud-download-outline"
        disabled={busy}
        onPress={onRestore}
      />
    </Card>
  );
}

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AppText } from '../components/ui/AppText';
import { BackupCard } from '../components/BackupCard';
import { Card } from '../components/ui/Card';
import { ReminderCard } from '../components/ReminderCard';
import { Screen } from '../components/ui/Screen';
import { Stepper } from '../components/Stepper';
import { getWeeklyGoal, setWeeklyGoal } from '../db/settingsRepository';
import { MAX_WEEKLY_GOAL } from '../domain/consistency';
import { headerScreenOptions } from '../theme';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [goal, setGoal] = useState<number | null>(null);
  const [restoreCount, setRestoreCount] = useState(0); // bumps to reload after a restore

  useEffect(() => {
    let cancelled = false;
    getWeeklyGoal(db).then((g) => {
      if (!cancelled) setGoal(g);
    });
    return () => {
      cancelled = true;
    };
  }, [db, restoreCount]);

  async function changeGoal(next: number) {
    const clamped = Math.min(MAX_WEEKLY_GOAL, Math.max(1, next));
    setGoal(clamped);
    await setWeeklyGoal(db, clamped);
  }

  return (
    <Screen scroll edges={['bottom']}>
      <Stack.Screen options={{ ...headerScreenOptions, headerShown: true, title: 'Settings' }} />

      {goal !== null ? (
        <Card>
          <AppText variant="heading">Weekly goal</AppText>
          <Stepper label="Workouts per week" value={goal} step={1} min={1} onChange={changeGoal} />
          <AppText variant="caption" tone="muted">
            Start low. A goal you keep beats a goal you skip.
          </AppText>
        </Card>
      ) : null}

      <ReminderCard key={restoreCount} />

      <BackupCard onRestored={() => setRestoreCount((n) => n + 1)} />
    </Screen>
  );
}

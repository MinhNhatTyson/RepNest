import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Chip } from './Chip';
import { Stepper } from './Stepper';
import { getReminderPlan, setReminderPlan } from '../db/settingsRepository';
import {
  DAY_LABELS,
  MAX_MINUTE_OF_DAY,
  REMINDER_STEP_MINUTES,
  formatMinuteOfDay,
  type ReminderPlan,
} from '../domain/reminders';
import { applyReminders, ensureReminderPermission, sendTestReminder } from '../services/reminders';
import { colors, radius, spacing, typography } from '../theme';

export function ReminderCard() {
  const db = useSQLiteContext();
  const [plan, setPlan] = useState<ReminderPlan | null>(null);
  const [blocked, setBlocked] = useState(false);
  // Taps are applied one after another, so fast changes can't double-schedule.
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    getReminderPlan(db).then((p) => {
      if (!cancelled) setPlan(p);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  function update(next: ReminderPlan) {
    setPlan(next);
    queue.current = queue.current.then(async () => {
      try {
        await setReminderPlan(db, next);
        if (next.days.length === 0) {
          setBlocked(false);
          await applyReminders(next);
          return;
        }
        const allowed = await ensureReminderPermission();
        setBlocked(!allowed);
        if (allowed) await applyReminders(next);
      } catch {
        Alert.alert('Could not set the reminder');
      }
    });
  }

  async function onTest() {
    try {
      if (await ensureReminderPermission()) {
        await sendTestReminder();
        Alert.alert('Test reminder', 'It arrives in 5 seconds. Leave the app to see it.');
      } else {
        setBlocked(true);
      }
    } catch {
      Alert.alert('Could not send the test');
    }
  }

  if (!plan) return null;

  function toggleDay(day: number) {
    if (!plan) return;
    const days = plan.days.includes(day)
      ? plan.days.filter((d) => d !== day)
      : [...plan.days, day].sort((a, b) => a - b);
    update({ ...plan, days });
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Reminders</Text>
      <Text style={styles.muted}>
        {plan.days.length === 0
          ? 'Pick the days you plan to train.'
          : `${formatMinuteOfDay(plan.minuteOfDay)} on your chosen days.`}
      </Text>

      <View style={styles.days}>
        {DAY_LABELS.map((label, day) => (
          <Chip
            key={label}
            label={label}
            selected={plan.days.includes(day)}
            onPress={() => toggleDay(day)}
          />
        ))}
      </View>

      <Stepper
        label="Time"
        value={plan.minuteOfDay}
        step={REMINDER_STEP_MINUTES}
        min={0}
        format={formatMinuteOfDay}
        onChange={(v) => update({ ...plan, minuteOfDay: Math.min(MAX_MINUTE_OF_DAY, v) })}
      />

      {blocked ? (
        <Text style={styles.muted}>
          Notifications are off for Repnest. You can turn them on in your phone settings.
        </Text>
      ) : null}

      {__DEV__ ? (
        <Pressable style={styles.testButton} onPress={onTest}>
          <Text style={styles.testText}>Send test reminder (dev)</Text>
        </Pressable>
      ) : null}
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
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  testButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  testText: { ...typography.caption, color: colors.textMuted },
});

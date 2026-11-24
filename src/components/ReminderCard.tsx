import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Chip } from './Chip';
import { getReminderPlan, setReminderPlan } from '../db/settingsRepository';
import { TimeInput } from './TimeInput';
import {
  DAY_LABELS,
  formatNextReminder,
  formatPlan,
  nextReminderAt,
  samePlan,
  type ReminderPlan,
} from '../domain/reminders';
import {
  applyReminders,
  ensureExactAlarmAccess,
  ensureReminderPermission,
  sendTestReminder,
} from '../services/reminders';
import { colors, minTapTarget, radius, spacing, typography } from '../theme';

// "today at 08:30". Called from handlers, never during render.
function nextLabel(plan: ReminderPlan): string | null {
  const now = Date.now();
  const next = nextReminderAt(plan, now);
  return next === null ? null : formatNextReminder(next, now);
}

export function ReminderCard() {
  const db = useSQLiteContext();
  const [saved, setSaved] = useState<ReminderPlan | null>(null); // what is really scheduled
  const [draft, setDraft] = useState<ReminderPlan | null>(null); // what the controls show
  const [next, setNext] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [approximate, setApproximate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getReminderPlan(db).then((p) => {
      if (cancelled) return;
      setSaved(p);
      setDraft(p);
      setNext(nextLabel(p));
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  async function onSave() {
    if (!draft || busy) return;
    setBusy(true);
    try {
      if (draft.days.length > 0) {
        const allowed = await ensureReminderPermission();
        setBlocked(!allowed);
        if (!allowed) return; // nothing is saved while notifications are off
        setApproximate(!(await ensureExactAlarmAccess()));
      } else {
        setBlocked(false);
        setApproximate(false);
      }
      const scheduled = await applyReminders(draft);
      if (scheduled !== draft.days.length) throw new Error('Reminders were not scheduled');
      await setReminderPlan(db, draft);
      setSaved(draft);
      setNext(nextLabel(draft));
    } catch {
      Alert.alert('Could not set the reminder');
    } finally {
      setBusy(false);
    }
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

  if (!saved || !draft) return null;

  const dirty = !samePlan(draft, saved);

  function toggleDay(day: number) {
    setDraft((d) =>
      d
        ? {
            ...d,
            days: d.days.includes(day)
              ? d.days.filter((x) => x !== day)
              : [...d.days, day].sort((a, b) => a - b),
          }
        : d,
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Reminders</Text>
      <Text style={styles.muted}>
        {draft.days.length === 0
          ? 'Pick the days you plan to train, then tap Save.'
          : formatPlan(draft)}
      </Text>

      <View style={styles.days}>
        {DAY_LABELS.map((label, day) => (
          <Chip
            key={label}
            label={label}
            selected={draft.days.includes(day)}
            onPress={() => toggleDay(day)}
          />
        ))}
      </View>

      <TimeInput
        minuteOfDay={draft.minuteOfDay}
        onChange={(minuteOfDay) => setDraft({ ...draft, minuteOfDay })}
      />

      {dirty ? (
        <Pressable
          style={[styles.saveButton, busy && styles.disabled]}
          disabled={busy}
          onPress={onSave}
        >
          <Text style={styles.saveText}>
            {busy ? 'Saving...' : draft.days.length === 0 ? 'Turn reminders off' : 'Save reminder'}
          </Text>
        </Pressable>
      ) : saved.days.length > 0 && next ? (
        <Text style={styles.status}>Saved. Next reminder {next}.</Text>
      ) : null}

      {blocked ? (
        <Text style={styles.muted}>
          Notifications are off for Repnest. You can turn them on in your phone settings.
        </Text>
      ) : null}

      {approximate ? (
        <Text style={styles.muted}>
          Your phone may deliver reminders a few minutes late. For exact times, allow &quot;Alarms
          &amp; reminders&quot; for Repnest in your phone settings.
        </Text>
      ) : null}

      <Pressable style={styles.testButton} onPress={onTest}>
        <Text style={styles.testText}>Send a test reminder</Text>
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
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  saveButton: {
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  saveText: { ...typography.body, color: colors.onPrimary, fontWeight: '700' },
  status: { ...typography.body, color: colors.success, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  testButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  testText: { ...typography.caption, color: colors.textMuted },
});

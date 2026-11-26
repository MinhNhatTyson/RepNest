import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
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
import { spacing } from '../theme';

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
    <Card>
      <AppText variant="heading">Reminders</AppText>
      <AppText tone="muted">
        {draft.days.length === 0
          ? 'Pick the days you plan to train, then tap Save.'
          : formatPlan(draft)}
      </AppText>

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
        <Button
          size="md"
          label={
            busy ? 'Saving...' : draft.days.length === 0 ? 'Turn reminders off' : 'Save reminder'
          }
          disabled={busy}
          onPress={onSave}
        />
      ) : saved.days.length > 0 && next ? (
        <AppText variant="bodyStrong" tone="success">
          Saved. Next reminder {next}.
        </AppText>
      ) : null}

      {blocked ? (
        <AppText tone="muted">
          Notifications are off for Repnest. You can turn them on in your phone settings.
        </AppText>
      ) : null}

      {approximate ? (
        <AppText tone="muted">
          Your phone may deliver reminders a few minutes late. For exact times, allow &quot;Alarms
          &amp; reminders&quot; for Repnest in your phone settings.
        </AppText>
      ) : null}

      <Button variant="quiet" size="md" label="Send a test reminder" onPress={onTest} />
    </Card>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stepper } from '../../components/Stepper';
import { getSessionEndTimes } from '../../db/sessionRepository';
import { getWeeklyGoal, setWeeklyGoal } from '../../db/settingsRepository';
import {
  MAX_WEEKLY_GOAL,
  addDays,
  buildCalendar,
  lastWeekLine,
  startOfWeek,
  summarizeWeek,
} from '../../domain/consistency';
import { colors, radius, spacing, typography } from '../../theme';
import { ReminderCard } from '../../components/ReminderCard';
import { BackupCard } from '../../components/BackupCard';

type Snapshot = { goal: number; times: number[]; now: number };

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        const [goal, times] = await Promise.all([getWeeklyGoal(db), getSessionEndTimes(db)]);
        if (!cancelled) setSnap({ goal, times, now: Date.now() });
      }
      load();
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  async function changeGoal(next: number) {
    const goal = Math.min(MAX_WEEKLY_GOAL, Math.max(1, next));
    setSnap((s) => (s ? { ...s, goal } : s));
    await setWeeklyGoal(db, goal);
  }

  if (!snap) {
    return <SafeAreaView style={styles.container} edges={['top']} />;
  }

  const { goal, times, now } = snap;
  const week = summarizeWeek(times, goal, now);
  const calendar = buildCalendar(times, goal, now);
  const thisWeekStart = startOfWeek(now);
  // Day-one users get no "quiet week" line: only show it once there is history before this week.
  const showLastWeek = times.some((t) => t < thisWeekStart);
  const lastWeek = summarizeWeek(times, goal, addDays(thisWeekStart, -1));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>History</Text>

        <View style={styles.card}>
          {week.streak > 0 ? (
            <View style={styles.streakRow}>
              <Text style={styles.streakNumber}>{week.streak}</Text>
              <Text style={styles.streakLabel}>
                {week.streak === 1 ? 'week in a row' : 'weeks in a row'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.cardTitle}>Your streak starts this week</Text>
              <Text style={styles.muted}>Hit your goal once and it begins.</Text>
            </>
          )}
          <Text style={styles.thisWeek}>
            {week.remaining === 0
              ? 'Goal reached this week. Nice.'
              : `${week.done} of ${goal} this week`}
          </Text>
          {showLastWeek ? <Text style={styles.muted}>{lastWeekLine(lastWeek)}</Text> : null}
          <Text style={styles.footnote}>A missed week is forgiven once every 4 weeks.</Text>
        </View>

        <View style={styles.card}>
          <Stepper label="Workouts per week" value={goal} step={1} min={1} onChange={changeGoal} />
        </View>
        <ReminderCard />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last 6 weeks</Text>
          <View style={styles.weekRow}>
            <View style={styles.days}>
              {DAY_LETTERS.map((letter, i) => (
                <Text key={i} style={styles.dayLetter}>
                  {letter}
                </Text>
              ))}
            </View>
            <View style={styles.countCol} />
          </View>
          {calendar.map((w) => (
            <View key={w.weekStart} style={styles.weekRow}>
              <View style={styles.days}>
                {w.days.map((d) => (
                  <View
                    key={d.dayStart}
                    style={[
                      styles.cell,
                      d.active && styles.cellActive,
                      d.isToday && styles.cellToday,
                      d.isFuture && styles.cellFuture,
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.countCol, styles.count, w.met && styles.countMet]}>
                {w.count}/{goal}
              </Text>
            </View>
          ))}
        </View>

        <BackupCard />
      </ScrollView>
    </SafeAreaView>
  );
}

const CELL = 32;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  title: { ...typography.title, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: { ...typography.body, color: colors.text, fontWeight: '700' },
  muted: { ...typography.body, color: colors.textMuted },
  streakRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  streakNumber: { ...typography.bigNumber, color: colors.primary },
  streakLabel: { ...typography.body, color: colors.textMuted },
  thisWeek: { ...typography.body, color: colors.text, fontWeight: '600' },
  footnote: { ...typography.caption, color: colors.textMuted },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  days: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  dayLetter: {
    ...typography.caption,
    color: colors.textMuted,
    width: CELL,
    textAlign: 'center',
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: CELL / 2,
    backgroundColor: colors.surfaceRaised,
  },
  cellActive: { backgroundColor: colors.success },
  cellToday: { borderWidth: 2, borderColor: colors.primary },
  cellFuture: { opacity: 0.35 },
  countCol: { width: 40, textAlign: 'right' },
  count: { ...typography.caption, color: colors.textMuted },
  countMet: { color: colors.success, fontWeight: '700' },
});

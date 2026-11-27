import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { getSessionEndTimes } from '../../db/sessionRepository';
import { getWeeklyGoal } from '../../db/settingsRepository';
import {
  GRACE_EVERY_WEEKS,
  addDays,
  buildCalendar,
  lastWeekLine,
  startOfWeek,
  summarizeWeek,
} from '../../domain/consistency';
import { colors, font, spacing } from '../../theme';

type Snapshot = { goal: number; times: number[]; now: number };

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CELL = 32;

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const [snap, setSnap] = useState<Snapshot | null>(null);

  // Reload on every focus, so a restored backup or a new session shows up right away.
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

  if (!snap) {
    return <Screen title="History">{null}</Screen>;
  }

  const { goal, times, now } = snap;
  const week = summarizeWeek(times, goal, now);
  const calendar = buildCalendar(times, goal, now);
  const thisWeekStart = startOfWeek(now);
  // Day-one users get no "quiet week" line: only show it once there is history before this week.
  const showLastWeek = times.some((t) => t < thisWeekStart);
  const lastWeek = summarizeWeek(times, goal, addDays(thisWeekStart, -1));

  return (
    <Screen scroll title="History">
      <Card variant="hero" style={styles.streakCard}>
        {week.streak > 0 ? (
          <>
            <AppText variant="display" tone="primary">
              {week.streak}
            </AppText>
            <AppText variant="bodyStrong" tone="muted">
              {week.streak === 1 ? 'week in a row' : 'weeks in a row'}
            </AppText>
          </>
        ) : (
          <>
            <AppText variant="heading" style={styles.center}>
              Your streak starts this week
            </AppText>
            <AppText tone="muted">Hit your goal once and it begins.</AppText>
          </>
        )}
        <AppText variant="bodyStrong">
          {week.remaining === 0
            ? 'Goal reached this week. Nice.'
            : `${week.done} of ${goal} this week`}
        </AppText>
        {showLastWeek ? (
          <AppText tone="muted" style={styles.center}>
            {lastWeekLine(lastWeek)}
          </AppText>
        ) : null}
      </Card>
      <AppText variant="caption" tone="faint" style={styles.center}>
        A missed week is forgiven once every {GRACE_EVERY_WEEKS} weeks.
      </AppText>

      <Card>
        <AppText variant="label" tone="faint">
          LAST 6 WEEKS
        </AppText>
        <View style={styles.weekRow}>
          <View style={styles.days}>
            {DAY_LETTERS.map((letter, i) => (
              <AppText key={i} variant="caption" tone="faint" style={styles.dayLetter}>
                {letter}
              </AppText>
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
            <AppText
              variant="caption"
              tone={w.met ? 'success' : 'muted'}
              style={[styles.countCol, w.met && styles.countMet]}
            >
              {w.count}/{goal}
            </AppText>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  streakCard: { alignItems: 'center' },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  days: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  dayLetter: { width: CELL, textAlign: 'center' },
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
  countMet: { fontFamily: font.bold },
});

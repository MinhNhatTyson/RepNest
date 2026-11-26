import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Ring } from '../../components/ui/Ring';
import { Screen } from '../../components/ui/Screen';
import { IconButton } from '../../components/ui/IconButton';
import {
  getLiteWorkoutId,
  getNextStarterWorkoutId,
  getWorkoutForStart,
} from '../../db/programRepository';
import { getSessionEndTimes } from '../../db/sessionRepository';
import { getReminderPlan, getWeeklyGoal } from '../../db/settingsRepository';
import { summarizeWeek, type WeekSummary } from '../../domain/consistency';
import { isComeback } from '../../domain/comeback';
import { estimateMinutes } from '../../domain/program';
import type { WorkoutDraft } from '../../domain/types';
import { startWorkout } from '../../services/startWorkout';
import { useActiveSessionStore } from '../../store/activeSessionStore';
import { colors } from '../../theme';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const activeSession = useActiveSessionStore((s) => s.session);
  const [workout, setWorkout] = useState<WorkoutDraft | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [week, setWeek] = useState<WeekSummary | null>(null);
  const [comeback, setComeback] = useState(false);
  const [liteId, setLiteId] = useState<number | null>(null);
  const [hasReminder, setHasReminder] = useState(false);
  const [dateLabel, setDateLabel] = useState('');

  // Reload on every focus so the rotation advances after a finished session.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        const [id, times, goal, lite, plan] = await Promise.all([
          getNextStarterWorkoutId(db),
          getSessionEndTimes(db),
          getWeeklyGoal(db),
          getLiteWorkoutId(db),
          getReminderPlan(db),
        ]);
        const loadedWorkout = id === null ? null : await getWorkoutForStart(db, id);
        if (!cancelled) {
          const now = Date.now();
          setWorkout(loadedWorkout?.workout ?? null);
          setWeek(summarizeWeek(times, goal, now));
          setComeback(isComeback(times, now));
          setLiteId(lite);
          setHasReminder(plan.days.length > 0);
          setDateLabel(
            new Date(now).toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            }),
          );
          setLoaded(true);
        }
      }
      load();
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  const reached = week !== null && week.remaining === 0;
  const progress = week ? week.done / week.goal : 0; // starts at 0, so the ring animates in

  const primary = activeSession ? (
    <Button label="Resume workout" icon="play" onPress={() => router.push('/session/guided')} />
  ) : workout ? (
    <Button
      label="Start today's workout"
      icon="play"
      onPress={() => startWorkout(db, workout.id ?? 0)}
    />
  ) : null;

  const lite =
    !activeSession && liteId !== null ? (
      <Button
        variant="quiet"
        label={comeback ? 'Ease in: 5-min version' : 'Short on time? 5-min version'}
        onPress={() => startWorkout(db, liteId)}
      />
    ) : null;

  const footer =
    primary || lite ? (
      <>
        {primary}
        {lite}
      </>
    ) : null;

  return (
    <Screen
      scroll
      title="Today"
      footer={footer}
      right={
        <IconButton
          icon="settings-outline"
          label="Settings"
          onPress={() => router.push('/settings')}
        />
      }
    >
      {dateLabel ? (
        <AppText variant="label" tone="faint">
          {dateLabel.toUpperCase()}
        </AppText>
      ) : null}

      {comeback && !activeSession ? (
        <AppText tone="muted">
          Welcome back. Good to see you. Pick up right where you left off.
        </AppText>
      ) : null}

      <Card variant="hero" style={{ alignItems: 'center' }}>
        <Ring
          size={208}
          strokeWidth={20}
          progress={progress}
          color={reached ? colors.success : colors.primary}
        >
          <AppText variant="display">{week ? week.done : ''}</AppText>
          <AppText variant="caption" tone="muted">
            {week ? (reached ? 'Weekly goal reached' : `of ${week.goal} this week`) : ''}
          </AppText>
        </Ring>
        {week && week.streak >= 2 ? (
          <AppText variant="bodyStrong" tone="success">
            {week.streak} weeks in a row
          </AppText>
        ) : null}
      </Card>

      {activeSession ? (
        <Card>
          <AppText variant="label" tone="primary">
            IN PROGRESS
          </AppText>
          <AppText variant="hero">{activeSession.name}</AppText>
        </Card>
      ) : workout ? (
        <Card>
          <AppText variant="label" tone="primary">
            UP NEXT
          </AppText>
          <AppText variant="hero">{workout.name}</AppText>
          <AppText tone="muted">
            {workout.items.length} exercises · about {estimateMinutes(workout.items)} min
          </AppText>
          <AppText variant="caption" tone="muted">
            {workout.items.map((item) => item.exerciseName).join(' · ')}
          </AppText>
        </Card>
      ) : loaded ? (
        <Card>
          <AppText variant="heading">No starter workout found</AppText>
          <AppText tone="muted">You can build one in the Workouts tab.</AppText>
          <Button
            variant="secondary"
            size="md"
            label="Open Workouts"
            onPress={() => router.push('/workouts')}
          />
        </Card>
      ) : null}

      {loaded && !hasReminder ? (
        <Button
          variant="quiet"
          size="md"
          icon="notifications-outline"
          label="Pick your workout days and a reminder"
          onPress={() => router.push('/settings')}
        />
      ) : null}
    </Screen>
  );
}

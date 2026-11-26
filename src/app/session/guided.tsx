import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Ring } from '../../components/ui/Ring';
import { Screen } from '../../components/ui/Screen';
import { getExerciseById } from '../../db/exerciseRepository';
import { getSessionEndTimes, saveSession } from '../../db/sessionRepository';
import { getWeeklyGoal } from '../../db/settingsRepository';
import { completionLines, summarizeWeek, type WeekSummary } from '../../domain/consistency';
import { buildLoggedSet, currentStep, setProgress } from '../../domain/guided';
import { suggestSet } from '../../domain/session';
import type { ActiveExercise } from '../../domain/types';
import { useCountdown } from '../../hooks/useCountdown';
import { useActiveSessionStore } from '../../store/activeSessionStore';
import { colors, radius, spacing } from '../../theme';

type Phase = 'intro' | 'ready' | 'work' | 'rest' | 'done';

const READY_SECONDS = 5;
const DEFAULT_TIMED_SECONDS = 30;
const RING = 260;
const STROKE = 22;

const ignore = () => {};
const cue = {
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore),
  go: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(ignore),
  done: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore),
};

export default function GuidedSessionScreen() {
  useKeepAwake(); // screen stays on while this screen is mounted

  const db = useSQLiteContext();
  const session = useActiveSessionStore((s) => s.session);
  const logSet = useActiveSessionStore((s) => s.logSet);
  const clear = useActiveSessionStore((s) => s.clear);
  const countdown = useCountdown();
  const [phase, setPhase] = useState<Phase>('intro');
  const [instructions, setInstructions] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [week, setWeek] = useState<WeekSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const current = useActiveSessionStore.getState().session;
      const ids = [...new Set(current?.exercises.map((e) => e.exerciseId) ?? [])];
      const rows = await Promise.all(ids.map((id) => getExerciseById(db, id)));
      if (cancelled) return;
      const map: Record<number, string> = {};
      for (const row of rows) {
        if (row) map[row.id] = row.instructions;
      }
      setInstructions(map);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [db]);

  // When the workout is done, work out "Session N this week". The session is only
  // saved on Finish, so the current moment is added to the saved ones.
  useEffect(() => {
    if (phase !== 'done') return;
    let cancelled = false;
    async function loadWeek() {
      const [times, goal] = await Promise.all([getSessionEndTimes(db), getWeeklyGoal(db)]);
      const now = Date.now();
      if (!cancelled) setWeek(summarizeWeek([...times, now], goal, now));
    }
    loadWeek();
    return () => {
      cancelled = true;
    };
  }, [db, phase]);

  // The actions below read the store with getState() so that timer callbacks
  // created in an older render never see stale data.
  function step() {
    return currentStep(useActiveSessionStore.getState().session);
  }

  function beginStep() {
    const next = step();
    if (!next) {
      setPhase('done');
      cue.done();
      return;
    }
    if (next.exercise.type === 'timed') {
      setPhase('ready');
      countdown.start(READY_SECONDS, beginWork);
    } else {
      cue.go();
      setPhase('work');
    }
  }

  function beginWork() {
    const next = step();
    if (!next) return;
    cue.go();
    setPhase('work');
    if (next.exercise.type === 'timed') {
      const seconds = next.exercise.targetSeconds ?? DEFAULT_TIMED_SECONDS;
      countdown.start(seconds, () => completeSet(seconds));
    }
  }

  function startRest(finished: ActiveExercise) {
    if (!step()) {
      setPhase('done');
      return;
    }
    if (finished.restSeconds <= 0) {
      beginStep();
      return;
    }
    setPhase('rest');
    countdown.start(finished.restSeconds, beginStep);
  }

  function completeSet(seconds?: number) {
    const current = step();
    if (!current) return;
    logSet(current.exercise.key, buildLoggedSet(current.exercise, current.setIndex, seconds));
    cue.done();
    startRest(current.exercise);
  }

  function onBegin() {
    cue.tap();
    beginStep();
  }

  function onDoneReps() {
    completeSet();
  }

  function onStopTimed() {
    const elapsed = countdown.stop();
    completeSet(Math.max(1, elapsed));
  }

  function onSkipReady() {
    countdown.stop();
    beginWork();
  }

  function onSkipRest() {
    countdown.stop();
    beginStep();
  }

  async function onFinish() {
    const current = useActiveSessionStore.getState().session;
    if (!current) return;
    countdown.stop();
    setSaving(true);
    try {
      await saveSession(db, current);
      clear();
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Could not save the workout');
    }
  }

  function onQuit() {
    Alert.alert('Quit workout?', 'Sets logged so far will be lost.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Quit',
        style: 'destructive',
        onPress: () => {
          countdown.stop();
          clear();
          router.back();
        },
      },
    ]);
  }

  function onTrackingView() {
    countdown.stop();
    router.replace('/session/active');
  }

  function onFinishEarly() {
    countdown.stop();
    setPhase('done'); // shows "You showed up" + the weekly ring; Finish there saves
    cue.done();
  }

  // Session was cleared (finished/quit) while the screen is closing.
  if (!session) {
    return <View style={styles.empty} />;
  }

  const next = currentStep(session);
  const { done, total } = setProgress(session);
  const exercise = next?.exercise;
  const suggested = next ? suggestSet(next.exercise, next.setIndex) : null;
  const timed = exercise?.type === 'timed';
  const instruction = exercise ? instructions[exercise.exerciseId] : undefined;
  const setLabel = next ? `SET ${next.setIndex + 1} OF ${next.exercise.targetSets}` : '';
  const lines = week ? completionLines(week) : null;
  const weekReached = week !== null && week.remaining === 0;

  const footer = (
    <>
      {phase === 'intro' && (
        <Button label={done > 0 ? 'Resume' : "Let's go"} icon="play" onPress={onBegin} />
      )}
      {phase === 'ready' && <Button variant="secondary" label="Start now" onPress={onSkipReady} />}
      {phase === 'work' && !timed && <Button label="Done" icon="checkmark" onPress={onDoneReps} />}
      {phase === 'work' && timed && (
        <Button variant="secondary" label="Done early" onPress={onStopTimed} />
      )}
      {phase === 'rest' && <Button variant="secondary" label="Skip rest" onPress={onSkipRest} />}
      {phase === 'done' && (
        <Button label="Finish" icon="checkmark" disabled={saving} onPress={onFinish} />
      )}
      {phase !== 'done' && phase !== 'intro' && done > 0 ? (
        <Button
          variant="quiet"
          label={`Finish early · ${done} sets so far`}
          onPress={onFinishEarly}
        />
      ) : null}
    </>
  );

  return (
    <Screen edges={['top', 'bottom']} footer={footer}>
      <Stack.Screen options={{ gestureEnabled: false }} />

      <View style={styles.topBar}>
        <AppText tone="muted" numberOfLines={1} style={styles.topTitle}>
          {session.name}
        </AppText>
        <Pressable style={styles.topButton} onPress={onTrackingView} accessibilityRole="button">
          <AppText tone="muted">Tracking</AppText>
        </Pressable>
        <Pressable style={styles.topButton} onPress={onQuit} accessibilityRole="button">
          <AppText tone="muted">Quit</AppText>
        </Pressable>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { flex: done }]} />
        <View style={{ flex: total - done }} />
      </View>

      <View style={styles.main}>
        {phase === 'intro' && (
          <>
            <AppText variant="label" tone="primary">
              {done > 0 ? 'NEXT UP' : 'FIRST UP'}
            </AppText>
            <AppText variant="hero" style={styles.center}>
              {exercise?.exerciseName ?? session.name}
            </AppText>
            <AppText tone="muted">{total - done} sets to go</AppText>
          </>
        )}

        {phase === 'ready' && exercise && (
          <>
            <AppText variant="label" tone="primary">
              GET READY
            </AppText>
            <AppText variant="hero" style={styles.center}>
              {exercise.exerciseName}
            </AppText>
            <Ring size={RING} strokeWidth={STROKE} progress={countdown.fraction} duration={0}>
              <AppText variant="display" style={styles.timer}>
                {countdown.remainingSeconds}
              </AppText>
            </Ring>
            {instruction ? (
              <AppText tone="muted" style={styles.center}>
                {instruction}
              </AppText>
            ) : null}
          </>
        )}

        {phase === 'work' && exercise && suggested && (
          <>
            <AppText variant="label" tone="primary">
              {setLabel}
            </AppText>
            <AppText variant="hero" style={styles.center}>
              {exercise.exerciseName}
            </AppText>
            {timed ? (
              <Ring size={RING} strokeWidth={STROKE} progress={countdown.fraction} duration={0}>
                <AppText variant="display" style={styles.timer}>
                  {countdown.remainingSeconds}
                </AppText>
              </Ring>
            ) : (
              <Card variant="hero" style={styles.statCard}>
                <AppText variant="display" style={styles.timer}>
                  {suggested.amount}
                </AppText>
                <AppText variant="heading" tone="muted">
                  {suggested.weight > 0 ? `reps · ${suggested.weight} kg` : 'reps'}
                </AppText>
              </Card>
            )}
            {instruction ? (
              <AppText tone="muted" style={styles.center}>
                {instruction}
              </AppText>
            ) : null}
          </>
        )}

        {phase === 'rest' && (
          <>
            <AppText variant="label" tone="success">
              REST
            </AppText>
            <Ring
              size={RING}
              strokeWidth={STROKE}
              progress={countdown.fraction}
              color={colors.success}
              duration={0}
            >
              <AppText variant="display" style={styles.timer}>
                {countdown.remainingSeconds}
              </AppText>
            </Ring>
            {next ? (
              <Card variant="quiet" style={styles.statCard}>
                <AppText variant="label" tone="faint">
                  NEXT
                </AppText>
                <AppText variant="heading" style={styles.center}>
                  {next.exercise.exerciseName}
                </AppText>
                <AppText variant="caption" tone="muted">
                  Set {next.setIndex + 1} of {next.exercise.targetSets}
                </AppText>
              </Card>
            ) : null}
          </>
        )}

        {phase === 'done' && (
          <>
            <AppText variant="label" tone="success">
              DONE
            </AppText>
            <AppText variant="hero" style={styles.center}>
              You showed up.
            </AppText>
            <Ring
              size={220}
              strokeWidth={20}
              progress={week ? week.done / week.goal : 0}
              color={weekReached ? colors.success : colors.primary}
            >
              <AppText variant="display">{week ? week.done : ''}</AppText>
              <AppText variant="caption" tone="muted">
                {week ? `of ${week.goal} this week` : ''}
              </AppText>
            </Ring>
            {lines ? (
              <>
                <AppText variant="heading" style={styles.center}>
                  {lines.headline}
                </AppText>
                <AppText tone="muted" style={styles.center}>
                  {lines.sub}
                </AppText>
              </>
            ) : null}
            <AppText variant="caption" tone="faint">
              {done} sets completed
            </AppText>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  topTitle: { flex: 1 },
  topButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  track: {
    flexDirection: 'row',
    height: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: { backgroundColor: colors.success },
  main: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  center: { textAlign: 'center' },
  timer: { fontSize: 88, lineHeight: 92 },
  statCard: { alignItems: 'center', alignSelf: 'stretch' },
});

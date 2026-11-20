import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getExerciseById } from '../../db/exerciseRepository';
import { saveSession } from '../../db/sessionRepository';
import { buildLoggedSet, currentStep, setProgress } from '../../domain/guided';
import { suggestSet } from '../../domain/session';
import type { ActiveExercise } from '../../domain/types';
import { useCountdown } from '../../hooks/useCountdown';
import { useActiveSessionStore } from '../../store/activeSessionStore';
import { colors, minTapTarget, radius, spacing, typography } from '../../theme';

type Phase = 'intro' | 'ready' | 'work' | 'rest' | 'done';

const READY_SECONDS = 5;
const DEFAULT_TIMED_SECONDS = 30;

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

  // Session was cleared (finished/quit) while the screen is closing.
  if (!session) {
    return <View style={styles.container} />;
  }

  const next = currentStep(session);
  const { done, total } = setProgress(session);
  const exercise = next?.exercise;
  const suggested = next ? suggestSet(next.exercise, next.setIndex) : null;
  const timed = exercise?.type === 'timed';
  const instruction = exercise ? instructions[exercise.exerciseId] : undefined;
  const setLabel = next ? `SET ${next.setIndex + 1} OF ${next.exercise.targetSets}` : '';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ gestureEnabled: false }} />

      <View style={styles.topBar}>
        <Text style={styles.title} numberOfLines={1}>
          {session.name}
        </Text>
        <Pressable style={styles.topButton} onPress={onTrackingView}>
          <Text style={styles.topButtonText}>Tracking</Text>
        </Pressable>
        <Pressable style={styles.topButton} onPress={onQuit}>
          <Text style={styles.topButtonText}>Quit</Text>
        </Pressable>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { flex: done }]} />
        <View style={{ flex: total - done }} />
      </View>

      <View style={styles.main}>
        {phase === 'intro' && (
          <>
            <Text style={styles.label}>{done > 0 ? 'NEXT UP' : 'FIRST UP'}</Text>
            <Text style={styles.heading}>{exercise?.exerciseName ?? session.name}</Text>
            <Text style={styles.sub}>{total - done} sets to go</Text>
          </>
        )}

        {phase === 'ready' && exercise && (
          <>
            <Text style={styles.label}>GET READY</Text>
            <Text style={styles.heading}>{exercise.exerciseName}</Text>
            <Text style={styles.bigNumber}>{countdown.remainingSeconds}</Text>
            {instruction ? <Text style={styles.instruction}>{instruction}</Text> : null}
          </>
        )}

        {phase === 'work' && exercise && suggested && (
          <>
            <Text style={styles.label}>{setLabel}</Text>
            <Text style={styles.heading}>{exercise.exerciseName}</Text>
            {timed ? (
              <>
                <Text style={styles.bigNumber}>{countdown.remainingSeconds}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { flex: countdown.fraction }]} />
                  <View style={{ flex: 1 - countdown.fraction }} />
                </View>
              </>
            ) : (
              <Text style={styles.bigNumber}>
                {suggested.amount}
                <Text style={styles.unit}>
                  {suggested.weight > 0 ? ` reps · ${suggested.weight} kg` : ' reps'}
                </Text>
              </Text>
            )}
            {instruction ? <Text style={styles.instruction}>{instruction}</Text> : null}
          </>
        )}

        {phase === 'rest' && (
          <>
            <Text style={styles.label}>REST</Text>
            <Text style={styles.bigNumber}>{countdown.remainingSeconds}</Text>
            {next ? (
              <Text style={styles.sub}>
                Next: {next.exercise.exerciseName} · set {next.setIndex + 1} of{' '}
                {next.exercise.targetSets}
              </Text>
            ) : null}
          </>
        )}

        {phase === 'done' && (
          <>
            <Text style={styles.label}>DONE</Text>
            <Text style={styles.heading}>You showed up.</Text>
            <Text style={styles.sub}>{done} sets completed. Nice work.</Text>
          </>
        )}
      </View>

      <View style={styles.footer}>
        {phase === 'intro' && (
          <Pressable style={styles.primaryButton} onPress={onBegin}>
            <Text style={styles.primaryText}>{done > 0 ? 'Resume' : "Let's go"}</Text>
          </Pressable>
        )}
        {phase === 'ready' && (
          <Pressable style={styles.secondaryButton} onPress={onSkipReady}>
            <Text style={styles.secondaryText}>Start now</Text>
          </Pressable>
        )}
        {phase === 'work' && !timed && (
          <Pressable style={styles.primaryButton} onPress={onDoneReps}>
            <Text style={styles.primaryText}>Done</Text>
          </Pressable>
        )}
        {phase === 'work' && timed && (
          <Pressable style={styles.secondaryButton} onPress={onStopTimed}>
            <Text style={styles.secondaryText}>Done early</Text>
          </Pressable>
        )}
        {phase === 'rest' && (
          <Pressable style={styles.secondaryButton} onPress={onSkipRest}>
            <Text style={styles.secondaryText}>Skip rest</Text>
          </Pressable>
        )}
        {phase === 'done' && (
          <Pressable
            style={[styles.finishButton, saving && styles.disabled]}
            disabled={saving}
            onPress={onFinish}
          >
            <Text style={styles.primaryText}>Finish</Text>
          </Pressable>
        )}
        {phase !== 'done' && phase !== 'intro' && done > 0 && (
          <Pressable style={styles.textButton} onPress={onFinish} disabled={saving}>
            <Text style={styles.textButtonText}>Finish early · {done} sets so far</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  title: { ...typography.body, color: colors.textMuted, flex: 1 },
  topButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  topButtonText: { ...typography.body, color: colors.textMuted },
  track: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  fill: { backgroundColor: colors.success },
  main: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  label: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  heading: { ...typography.title, fontSize: 34, color: colors.text },
  sub: { ...typography.body, color: colors.textMuted },
  bigNumber: { ...typography.bigNumber, fontSize: 96, lineHeight: 104, color: colors.text },
  unit: { ...typography.body, color: colors.textMuted },
  instruction: { ...typography.body, color: colors.textMuted, lineHeight: 24 },
  footer: { padding: spacing.md, gap: spacing.sm },
  primaryButton: {
    minHeight: minTapTarget + 16,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishButton: {
    minHeight: minTapTarget + 16,
    borderRadius: radius.md,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { ...typography.body, fontSize: 20, color: colors.onPrimary, fontWeight: '800' },
  secondaryButton: {
    minHeight: minTapTarget + 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { ...typography.body, fontSize: 18, color: colors.text, fontWeight: '700' },
  textButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  textButtonText: { ...typography.caption, color: colors.textMuted },
  disabled: { opacity: 0.4 },
});

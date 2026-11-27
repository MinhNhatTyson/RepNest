import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AppText } from './ui/AppText';
import { Chip } from './Chip';
import { formatMinuteOfDay, parseTimePart } from '../domain/reminders';
import { colors, font, minTapTarget, radius, spacing } from '../theme';

type Props = {
  minuteOfDay: number;
  onChange: (minuteOfDay: number) => void;
};

const PRESETS = [6 * 60 + 30, 7 * 60, 12 * 60, 18 * 60, 20 * 60];

const digits = (text: string) => text.replace(/\D/g, '').slice(0, 2);
const pad = (n: number) => String(n).padStart(2, '0');

// While a field is being typed in, `draft` holds the raw text. Otherwise it is
// null and the field shows the real value, so presets and Save always win.
export function TimeInput({ minuteOfDay, onChange }: Props) {
  const [hourDraft, setHourDraft] = useState<string | null>(null);
  const [minuteDraft, setMinuteDraft] = useState<string | null>(null);

  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;

  function onHourText(text: string) {
    const clean = digits(text);
    setHourDraft(clean);
    const h = parseTimePart(clean, 23);
    if (h !== null) onChange(h * 60 + minute);
  }

  function onMinuteText(text: string) {
    const clean = digits(text);
    setMinuteDraft(clean);
    const m = parseTimePart(clean, 59);
    if (m !== null) onChange(hour * 60 + m);
  }

  function pickPreset(value: number) {
    setHourDraft(null);
    setMinuteDraft(null);
    onChange(value);
  }

  return (
    <View style={styles.container}>
      <AppText tone="muted">Time</AppText>
      <View style={styles.fields}>
        <TextInput
          style={styles.input}
          value={hourDraft ?? pad(hour)}
          onChangeText={onHourText}
          onBlur={() => setHourDraft(null)}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          accessibilityLabel="Hour"
        />
        <AppText variant="title" tone="muted">
          :
        </AppText>
        <TextInput
          style={styles.input}
          value={minuteDraft ?? pad(minute)}
          onChangeText={onMinuteText}
          onBlur={() => setMinuteDraft(null)}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          accessibilityLabel="Minute"
        />
        <AppText variant="caption" tone="muted" style={styles.hint}>
          24-hour
        </AppText>
      </View>
      <View style={styles.presets}>
        {PRESETS.map((value) => (
          <Chip
            key={value}
            label={formatMinuteOfDay(value)}
            selected={minuteOfDay === value}
            onPress={() => pickPreset(value)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  fields: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    fontFamily: font.bold,
    fontSize: 28,
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: minTapTarget,
    width: 72,
    paddingVertical: 0,
    textAlign: 'center',
  },
  hint: { marginLeft: spacing.sm },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

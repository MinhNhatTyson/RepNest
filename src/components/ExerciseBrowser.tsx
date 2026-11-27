import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { AppText } from './ui/AppText';
import { Chip } from './Chip';
import { searchExercises } from '../db/exerciseRepository';
import {
  EQUIPMENT,
  MUSCLE_GROUPS,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from '../domain/types';
import { colors, minTapTarget, radius, spacing } from '../theme';

type Props = {
  onSelect: (exercise: Exercise) => void;
};

export function ExerciseBrowser({ onSelect }: Props) {
  const db = useSQLiteContext();
  const [query, setQuery] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let cancelled = false;
    searchExercises(db, { query, muscleGroup, equipment }).then((rows) => {
      if (!cancelled) setExercises(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [db, query, muscleGroup, equipment]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search exercises"
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled"
      >
        {MUSCLE_GROUPS.map((group) => (
          <Chip
            key={group}
            label={group}
            selected={muscleGroup === group}
            onPress={() => setMuscleGroup(muscleGroup === group ? null : group)}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled"
      >
        {EQUIPMENT.map((item) => (
          <Chip
            key={item}
            label={item}
            selected={equipment === item}
            onPress={() => setEquipment(equipment === item ? null : item)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={exercises}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
        ListEmptyComponent={
          <AppText tone="muted" style={styles.empty}>
            No exercises match.
          </AppText>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => onSelect(item)}
            accessibilityRole="button"
          >
            <View style={styles.rowText}>
              <AppText variant="bodyStrong">{item.name}</AppText>
              <AppText variant="caption" tone="muted">
                {item.muscleGroup} · {item.equipment}
              </AppText>
            </View>
            {item.type === 'timed' ? (
              <AppText variant="label" tone="success">
                TIMED
              </AppText>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.md },
  search: {
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md,
    height: minTapTarget,
  },
  chipScroll: { flexGrow: 0, marginTop: spacing.sm },
  chipRow: { paddingHorizontal: spacing.md, gap: spacing.sm },
  list: { padding: spacing.md, gap: spacing.sm },
  row: {
    minHeight: minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  rowText: { flex: 1, gap: 2 },
  empty: { textAlign: 'center', marginTop: spacing.xl },
});

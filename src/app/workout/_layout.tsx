import { Stack } from 'expo-router';
import { colors, headerScreenOptions } from '../../theme';

export default function WorkoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="[id]" options={{ title: 'Workout' }} />
      <Stack.Screen name="pick-exercise" options={{ title: 'Add exercise' }} />
      <Stack screenOptions={headerScreenOptions}></Stack>
    </Stack>
  );
}

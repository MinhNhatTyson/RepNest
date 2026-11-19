import { Stack } from 'expo-router';
import { colors } from '../../theme';

export default function ExercisesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Exercise library' }} />
      <Stack.Screen name="[id]" options={{ title: 'Exercise' }} />
    </Stack>
  );
}

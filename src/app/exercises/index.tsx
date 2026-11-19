import { router } from 'expo-router';
import { ExerciseBrowser } from '../../components/ExerciseBrowser';

export default function ExerciseLibraryScreen() {
  return (
    <ExerciseBrowser
      onSelect={(exercise) =>
        router.push({ pathname: '/exercises/[id]', params: { id: String(exercise.id) } })
      }
    />
  );
}

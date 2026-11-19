import { router } from 'expo-router';
import { ExerciseBrowser } from '../../components/ExerciseBrowser';
import { useWorkoutDraftStore } from '../../store/workoutDraftStore';

export default function PickExerciseScreen() {
  const addExercise = useWorkoutDraftStore((s) => s.addExercise);

  return (
    <ExerciseBrowser
      onSelect={(exercise) => {
        addExercise(exercise);
        router.back();
      }}
    />
  );
}

import { router, useLocalSearchParams } from "expo-router";
import { Button, Heading, InlineError, Screen } from "@/components/ui";
import { WorkoutForm } from "@/components/workout-form";
export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);
  if (isNaN(workoutId) || !Number.isInteger(workoutId) || workoutId <= 0) {
    return <Screen><Heading>Edit workout</Heading><InlineError>Invalid workout ID.</InlineError><Button title="Back" variant="secondary" onPress={() => router.back()} /></Screen>;
  }
  return <WorkoutForm workoutId={workoutId} />;
}

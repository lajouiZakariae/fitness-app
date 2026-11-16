import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Button, Card, Heading, Screen } from "@/components/ui";
import {
  getActiveSession,
  listWorkouts,
  startSession,
  type Workout,
} from "@/db/queries";
import { colors, spacing, typography } from "@/theme/colors";

export default function ChooseWorkoutScreen() {
  const db = useSQLiteContext();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  useFocusEffect(
    useCallback(() => {
      void listWorkouts(db).then(setWorkouts);
    }, [db]),
  );
  const choose = async (workout: Workout) => {
    try {
      const active = await getActiveSession(db);
      if (active) {
        Alert.alert(
          "Workout in progress",
          "Resume or discard your current workout before starting another.",
        );
        return;
      }
      const id = await startSession(db, workout.id);
      router.replace({ pathname: "/session/[id]", params: { id: String(id) } });
    } catch {
      Alert.alert("Could not start workout", "Please try again.");
    }
  };
  return (
    <Screen scroll>
      <Heading subtitle="Choose a template to begin">Start a workout</Heading>
      {workouts.length ? (
        workouts.map((workout) => (
          <Pressable key={workout.id} onPress={() => void choose(workout)}>
            <Card style={styles.row}>
              <Text style={styles.workoutName}>{workout.name}</Text>
              <Text style={styles.detail}>
                {workout.exercise_count} exercises
              </Text>
              <Text style={styles.arrow}>›</Text>
            </Card>
          </Pressable>
        ))
      ) : (
        <Card>
          <Text style={styles.workoutName}>No workouts yet</Text>
          <Text style={styles.detail}>
            Create a workout template, then come back here to start.
          </Text>
          <Button
            title="Create workout"
            onPress={() => router.push("/workout/new")}
          />
        </Card>
      )}
      <Button title="Back" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  workoutName: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "800",
    flex: 1,
  },
  detail: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    width: "100%",
  },
  arrow: {
    position: "absolute",
    right: spacing.lg,
    color: colors.primary,
    fontSize: 30,
  },
});

import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Button, Card, Heading, InlineError, Screen } from "@/components/ui";
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
  const [phase, setPhase] = useState<"loading" | "error" | "success">("loading");
  const [loadError, setLoadError] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("Loading workouts…");
  const [actionError, setActionError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setPhase("loading");
      setLoadingMessage(retryKey ? "Retrying workout load…" : "Loading workouts…");
      setLoadError("");
      const load = async () => {
        try {
          const result = await listWorkouts(db);
          if (!cancelled) {
            setWorkouts(result);
            setPhase("success");
          }
        } catch (error) {
          console.error("Could not load workouts.", error);
          if (!cancelled) {
            setLoadError("Could not load workouts.");
            setPhase("error");
          }
        }
      };
      void load();
      return () => { cancelled = true; };
    }, [db, retryKey]),
  );
  const choose = async (workout: Workout) => {
    setActionError("");
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("active session")) {
        setActionError("A workout is already in progress. Resume or finish it before starting another.");
      } else if (message.toLowerCase().includes("workout not found")) {
        setActionError("This workout is no longer available. Refresh and try another.");
      } else {
        console.error("Could not start workout.", error);
        setActionError("Could not start workout. Please try again.");
      }
    }
  };
  if (phase === "loading") return <Screen><Heading>Start a workout</Heading><Text style={styles.detail}>{loadingMessage}</Text></Screen>;
  if (phase === "error") return <Screen><Heading>Start a workout</Heading><InlineError>{loadError}</InlineError><Button title="Retry" onPress={() => setRetryKey((key) => key + 1)} /><Button title="Back" variant="secondary" onPress={() => router.back()} /></Screen>;
  return (
    <Screen scroll>
      <Heading subtitle="Choose a template to begin">Start a workout</Heading>
      <InlineError>{actionError}</InlineError>
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

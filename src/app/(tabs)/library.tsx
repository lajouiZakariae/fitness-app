import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Button, Card, Heading, InlineError, Screen, sharedStyles } from "@/components/ui";
import {
  listExercises,
  listWorkouts,
  type Exercise,
  type Workout,
} from "@/db/queries";
import { colors, radius, spacing, typography } from "@/theme/colors";

export default function LibraryScreen() {
  const db = useSQLiteContext();
  const [tab, setTab] = useState<"Exercises" | "Workouts">("Exercises");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [phase, setPhase] = useState<"loading" | "error" | "success">("loading");
  const [loadError, setLoadError] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("Loading your library…");
  const [retryKey, setRetryKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setPhase("loading");
      setLoadingMessage(retryKey ? "Retrying library load…" : "Loading your library…");
      setLoadError("");
      const load = async () => {
        try {
          const [nextExercises, nextWorkouts] = await Promise.all([
            listExercises(db), listWorkouts(db),
          ]);
          if (!cancelled) {
            setExercises(nextExercises);
            setWorkouts(nextWorkouts);
            setPhase("success");
          }
        } catch (error) {
          console.error("Could not load the library.", error);
          if (!cancelled) {
            setLoadError("Could not load your library.");
            setPhase("error");
          }
        }
      };
      void load();
      return () => { cancelled = true; };
    }, [db, retryKey]),
  );
  if (phase === "loading") return <Screen><Heading>Library</Heading><Text style={styles.detail}>{loadingMessage}</Text></Screen>;
  if (phase === "error") return <Screen><Heading>Library</Heading><InlineError>{loadError}</InlineError><Button title="Retry" onPress={() => setRetryKey((key) => key + 1)} /></Screen>;
  const items = tab === "Exercises" ? exercises : workouts;
  return (
    <Screen scroll>
      <Heading subtitle="Your training library">Library</Heading>
      <View style={styles.segment}>
        {(["Exercises", "Workouts"] as const).map((value) => (
          <Pressable
            key={value}
            style={[
              styles.segmentButton,
              tab === value ? styles.segmentActive : null,
            ]}
            onPress={() => setTab(value)}
          >
            <Text
              style={[
                styles.segmentText,
                tab === value ? styles.segmentTextActive : null,
              ]}
            >
              {value}
            </Text>
          </Pressable>
        ))}
      </View>
      {items.length ? (
        items.map((item) => (
          <Pressable
            key={`${tab}-${item.id}`}
            onPress={() =>
              tab === "Workouts" &&
              router.push({
                pathname: "/workout/[id]",
                params: { id: String(item.id) },
              })
            }
          >
            <Card style={sharedStyles.spread}>
              <View style={styles.item}>
                <Text style={styles.name}>
                  {tab === "Exercises"
                    ? (item as Exercise).name
                    : (item as Workout).name}
                </Text>
                <Text style={styles.detail}>
                  {tab === "Exercises"
                    ? (item as Exercise).muscle
                    : `${(item as Workout).exercise_count} exercises`}
                </Text>
              </View>
              {tab === "Workouts" ? (
                <Text style={styles.chevron}>›</Text>
              ) : null}
            </Card>
          </Pressable>
        ))
      ) : (
        <Card>
          <Text style={styles.name}>No {tab.toLowerCase()} yet</Text>
          <Text style={styles.detail}>
            {tab === "Exercises"
              ? "Add your first exercise to start building workouts."
              : "Create a workout from your exercise library."}
          </Text>
          <Button
            title={tab === "Exercises" ? "Add exercise" : "Add workout"}
            onPress={() =>
              router.push(
                tab === "Exercises" ? "/exercise/new" : "/workout/new",
              )
            }
          />
        </Card>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: colors.surfaceElevated },
  segmentText: { color: colors.textSecondary, fontWeight: "700" },
  segmentTextActive: { color: colors.textPrimary },
  item: { flex: 1, gap: spacing.xs },
  name: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "800",
  },
  detail: { color: colors.textSecondary, fontSize: typography.caption },
  chevron: { color: colors.primary, fontSize: 30 },
});

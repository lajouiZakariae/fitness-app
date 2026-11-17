import { Button, Card, Heading, InlineError, Screen } from "@/components/ui";
import {
  getActiveSession,
  listRecentWorkouts,
  startSession,
  type Session,
  type Workout,
} from "@/db/queries";
import { colors, radius, spacing, typography } from "@/theme/colors";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [session, setSession] = useState<Session | null>(null);
  const [recent, setRecent] = useState<Workout[]>([]);
  const [phase, setPhase] = useState<"loading" | "error" | "success">(
    "loading",
  );
  const [error, setError] = useState("");
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading workout status…",
  );
  const [retryKey, setRetryKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setPhase("loading");
      setLoadingMessage(
        retryKey ? "Retrying workout status…" : "Loading workout status…",
      );
      setError("");
      const load = async () => {
        try {
          const active = await getActiveSession(db);
          const history = await listRecentWorkouts(db);
          if (!cancelled) {
            setSession(active);
            setRecent(history);
            setPhase("success");
          }
        } catch (loadError) {
          console.error("Could not load the active session.", loadError);
          if (!cancelled) {
            setError("Could not load your workout status.");
            setPhase("error");
          }
        }
      };
      void load();
      return () => {
        cancelled = true;
      };
    }, [db, retryKey]),
  );

  const total =
    session?.exercises.reduce(
      (sum, exercise) => sum + exercise.sets.length,
      0,
    ) ?? 0;
  const completed =
    session?.exercises.reduce(
      (sum, exercise) =>
        sum + exercise.sets.filter((set) => set.completed).length,
      0,
    ) ?? 0;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>TRAINING, MADE SIMPLE</Text>
        <Heading subtitle="Build consistency, one workout at a time.">
          Welcome back
        </Heading>
        <Button
          title="Start a workout"
          onPress={() => router.push("/choose-workout")}
        />
      </View>
      {phase === "loading" ? (
        <Text style={styles.secondary}>{loadingMessage}</Text>
      ) : null}
      {phase === "error" ? (
        <View style={styles.errorBlock}>
          <InlineError>{error}</InlineError>
          <Button
            title="Retry"
            variant="secondary"
            onPress={() => setRetryKey((key) => key + 1)}
          />
        </View>
      ) : null}
      {phase === "success" && session ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/session/[id]",
              params: { id: String(session.id) },
            })
          }
        >
          <Card style={styles.resumeCard}>
            <View style={styles.resumeText}>
              <Text style={styles.eyebrow}>WORKOUT IN PROGRESS</Text>
              <Text style={styles.sectionTitle}>{session.workout_name}</Text>
              <Text style={styles.secondary}>
                {completed} of {total} sets completed
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${total ? (completed / total) * 100 : 0}%` },
                ]}
              />
            </View>
          </Card>
        </Pressable>
      ) : null}
      {phase === "success" && recent.length ? (
        <View style={styles.recent}>
          <Text style={styles.sectionTitle}>Recent workouts</Text>
          {recent.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={async () => {
                try {
                  const id = await startSession(db, item.id);
                  router.push({
                    pathname: "/session/[id]",
                    params: { id: String(id) },
                  });
                } catch {
                  setError(
                    "Finish your current workout before starting another.",
                  );
                  setPhase("error");
                }
              }}
            >
              <Card style={styles.recentCard}>
                <View>
                  <Text style={styles.recentName}>{item.name}</Text>
                  <Text style={styles.secondary}>{item.exercise_count} exercises</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Card style={styles.tip}>
        <Text style={styles.sectionTitle}>Your training library</Text>
        <Text style={styles.description}>
          Create exercises and reusable workout templates from the Library tab.
        </Text>
        <Button
          title="Open library"
          variant="secondary"
          onPress={() => router.push("/(tabs)/library")}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md, paddingVertical: spacing.md },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "800",
    letterSpacing: 1,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.heading,
    fontWeight: "800",
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 23,
  },
  resumeText: { flex: 1, gap: spacing.xs },
  secondary: { color: colors.textSecondary, fontSize: typography.caption },
  arrow: { fontSize: 34, color: colors.primary },
  resumeCard: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  track: {
    width: "100%",
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  tip: { marginTop: "auto" },
  recent: { gap: spacing.sm },
  recentCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recentName: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "700",
  },
  errorBlock: { gap: spacing.sm },
});

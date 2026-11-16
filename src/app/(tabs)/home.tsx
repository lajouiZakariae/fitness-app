import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Button, Card, Heading, Screen, sharedStyles } from "@/components/ui";
import { getActiveSession, type Session } from "@/db/queries";
import { colors, radius, spacing, typography } from "@/theme/colors";

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [session, setSession] = useState<Session | null>(null);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      getActiveSession(db)
        .then((value) => {
          if (live) setSession(value);
        })
        .catch(() => {});
      return () => {
        live = false;
      };
    }, [db]),
  );
  const completed =
    session?.exercises.reduce(
      (sum, exercise) =>
        sum + exercise.sets.filter((set) => set.completed).length,
      0,
    ) ?? 0;
  const total =
    session?.exercises.reduce(
      (sum, exercise) => sum + exercise.sets.length,
      0,
    ) ?? 0;
  const start = () => {
    if (session)
      Alert.alert(
        "Workout in progress",
        "Resume your current workout or discard it and start a new one?",
        [
          {
            text: "Keep going",
            onPress: () =>
              router.push({
                pathname: "/session/[id]",
                params: { id: String(session.id) },
              }),
          },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              void db
                .runAsync(
                  "DELETE FROM sessions WHERE id=? AND status='in_progress'",
                  session.id,
                )
                .then(() => {
                  setSession(null);
                  router.push("/choose-workout");
                });
            },
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
    else router.push("/choose-workout");
  };
  return (
    <Screen scroll>
      <Heading>Ready to train?</Heading>
      <Card style={styles.hero}>
        <Text style={styles.eyebrow}>YOUR NEXT SESSION</Text>
        <Text style={styles.heroTitle}>Make today count.</Text>
        <Text style={styles.description}>
          Pick a workout and track every set as you go.
        </Text>
        <Button title="Start a workout" onPress={start} />
      </Card>
      {session ? (
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/session/[id]",
              params: { id: String(session.id) },
            })
          }
          accessibilityRole="button"
        >
          <Card>
            <View style={sharedStyles.spread}>
              <View style={styles.resumeText}>
                <Text style={styles.sectionTitle}>Resume workout</Text>
                <Text style={styles.secondary}>{session.workout_name}</Text>
                <Text style={styles.secondary}>
                  Started{" "}
                  {new Date(session.started_at).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${total ? (completed / total) * 100 : 0}%` },
                ]}
              />
            </View>
            <Text style={styles.secondary}>
              {completed} of {total} sets completed
            </Text>
          </Card>
        </Pressable>
      ) : (
        <Card style={styles.tip}>
          <Text style={styles.sectionTitle}>Build your library</Text>
          <Text style={styles.secondary}>
            Add exercises and organize them into workouts using the + button.
          </Text>
        </Card>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  hero: { padding: spacing.xl },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heroTitle: { color: colors.textPrimary, fontSize: 26, fontWeight: "800" },
  description: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 23,
    marginBottom: spacing.sm,
  },
  resumeText: { flex: 1, gap: spacing.xs },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.heading,
    fontWeight: "800",
  },
  secondary: { color: colors.textSecondary, fontSize: typography.caption },
  arrow: { fontSize: 34, color: colors.primary },
  track: {
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
});

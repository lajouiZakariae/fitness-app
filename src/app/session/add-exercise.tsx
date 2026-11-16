import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Button, Card, Heading, InlineError, Screen } from "@/components/ui";
import {
  addExerciseToSession,
  listExercises,
  replaceSessionExercise,
  type Exercise,
} from "@/db/queries";
import { colors, radius, spacing, typography } from "@/theme/colors";

export default function AddSessionExerciseScreen() {
  const db = useSQLiteContext();
  const { sessionId: rawSessionId, replaceId: rawReplaceId } =
    useLocalSearchParams<{ sessionId: string; replaceId?: string }>();
  const sessionId = Number(rawSessionId);
  const replaceId = rawReplaceId ? Number(rawReplaceId) : null;
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoadError("");
      void listExercises(db)
        .then((items) => {
          if (!cancelled) setExercises(items);
        })
        .catch((reason) => {
          console.error("Could not load exercises.", reason);
          if (!cancelled) setLoadError("Could not load your exercise list.");
        });
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return exercises.filter(
      (exercise) =>
        exercise.name.toLocaleLowerCase().includes(normalizedQuery) ||
        exercise.muscle.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [exercises, query]);

  const chooseExercise = async (exercise: Exercise) => {
    if (!Number.isInteger(sessionId) || sessionId < 1 || loading) {
      setError("This workout session is no longer available.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (replaceId !== null) {
        await replaceSessionExercise(db, replaceId, exercise);
      } else {
        await addExerciseToSession(db, sessionId, exercise);
      }
      router.back();
    } catch (reason) {
      console.error("Could not update the workout exercise.", reason);
      setError("Could not update this workout. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Heading
        subtitle={
          replaceId !== null
            ? "Choose a replacement from your exercise library"
            : "Choose an exercise to add to this session"
        }
      >
        {replaceId !== null ? "Change exercise" : "Add exercise"}
      </Heading>
      <TextInput
        accessibilityLabel="Search exercises"
        value={query}
        onChangeText={setQuery}
        placeholder="Search exercises or muscle"
        placeholderTextColor={colors.textSecondary}
        style={styles.search}
        returnKeyType="search"
      />
      <InlineError>{loadError || error}</InlineError>
      {filtered.length ? (
        filtered.map((exercise) => (
          <Pressable
            key={exercise.id}
            disabled={loading}
            onPress={() => void chooseExercise(exercise)}
            accessibilityRole="button"
            accessibilityLabel={`Choose ${exercise.name}, ${exercise.muscle}`}
          >
            <Card style={styles.exerciseCard}>
              <View style={styles.exerciseCopy}>
                <Text style={styles.name}>{exercise.name}</Text>
                <Text style={styles.detail}>{exercise.muscle}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Card>
          </Pressable>
        ))
      ) : (
        <Card>
          <Text style={styles.name}>
            {exercises.length ? "No matching exercises" : "No exercises yet"}
          </Text>
          <Text style={styles.detail}>
            {exercises.length
              ? "Try another search."
              : "Add exercises to your library before updating this session."}
          </Text>
        </Card>
      )}
      <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    fontSize: typography.body,
  },
  exerciseCard: { flexDirection: "row", alignItems: "center" },
  exerciseCopy: { flex: 1, gap: spacing.xs },
  name: { color: colors.textPrimary, fontSize: typography.body, fontWeight: "800" },
  detail: { color: colors.textSecondary, fontSize: typography.caption },
  chevron: { color: colors.primary, fontSize: 30 },
});

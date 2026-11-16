import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import {
  Button,
  Card,
  Field,
  Heading,
  InlineError,
  Screen,
  sharedStyles,
} from "@/components/ui";
import {
  getWorkout,
  listExercises,
  saveWorkout,
  type Exercise,
  type WorkoutExercise,
} from "@/db/queries";
import { colors, radius, spacing, typography } from "@/theme/colors";

type Draft = {
  exercise_id: number;
  name: string;
  muscle: string;
  sets: string;
  reps: string;
  rest_seconds: string;
};
export function WorkoutForm({ workoutId }: { workoutId?: number }) {
  const db = useSQLiteContext();
  const [name, setName] = useState("");
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [items, setItems] = useState<Draft[]>([]);
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      let live = true;
      void Promise.all([
        listExercises(db),
        workoutId ? getWorkout(db, workoutId) : Promise.resolve(null),
      ]).then(([available, workout]) => {
        if (!live) return;
        setLibrary(available);
        if (workout) {
          setName(workout.name);
          setItems(workout.exercises.map((item) => toDraft(item)));
        }
      });
      return () => {
        live = false;
      };
    }, [db, workoutId]),
  );
  const addExercise = (exercise: Exercise) =>
    setItems((current) => [
      ...current,
      {
        exercise_id: exercise.id,
        name: exercise.name,
        muscle: exercise.muscle,
        sets: "3",
        reps: "10",
        rest_seconds: "90",
      },
    ]);
  const patchItem = (index: number, patch: Partial<Draft>) =>
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  const reorder = (index: number, direction: -1 | 1) =>
    setItems((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const save = async () => {
    if (!name.trim()) {
      setError("Enter a workout name.");
      return;
    }
    if (!items.length) {
      setError("Add at least one exercise.");
      return;
    }
    const parsed = items.map((item) => ({
      exercise_id: item.exercise_id,
      sets: Number(item.sets),
      reps: Number(item.reps),
      rest_seconds: Number(item.rest_seconds),
    }));
    if (
      parsed.some(
        (item) =>
          !Number.isInteger(item.sets) ||
          item.sets < 1 ||
          !Number.isInteger(item.reps) ||
          item.reps < 1 ||
          !Number.isInteger(item.rest_seconds) ||
          item.rest_seconds < 0,
      )
    ) {
      setError(
        "Sets and reps must be whole numbers greater than zero. Rest must be zero or more seconds.",
      );
      return;
    }
    try {
      await saveWorkout(db, { id: workoutId, name, exercises: parsed });
      router.back();
    } catch {
      setError("Could not save the workout.");
    }
  };
  const deleteTemplate = () => {
    if (!workoutId) return;
    Alert.alert("Delete workout?", "Completed workout sessions will be kept.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void db
            .runAsync("DELETE FROM workouts WHERE id=?", workoutId)
            .then(() => router.back());
        },
      },
    ]);
  };
  return (
    <Screen scroll>
      <Heading
        subtitle={
          workoutId ? "Update your template" : "Build a reusable template"
        }
      >
        {workoutId ? "Edit workout" : "New workout"}
      </Heading>
      <Field
        label="Workout name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Upper body"
        autoCapitalize="words"
      />
      {items.map((item, index) => (
        <Card key={`${item.exercise_id}-${index}`}>
          <View style={sharedStyles.spread}>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{item.name}</Text>
              <Text style={styles.muted}>{item.muscle}</Text>
            </View>
            <View style={sharedStyles.row}>
              <Pressable
                accessibilityLabel="Move exercise up"
                style={sharedStyles.smallButton}
                onPress={() => reorder(index, -1)}
              >
                <Text style={styles.icon}>↑</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Move exercise down"
                style={sharedStyles.smallButton}
                onPress={() => reorder(index, 1)}
              >
                <Text style={styles.icon}>↓</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Remove exercise"
                style={sharedStyles.smallButton}
                onPress={() =>
                  setItems((current) => current.filter((_, i) => i !== index))
                }
              >
                <Text style={styles.remove}>×</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.fields}>
            <Field
              label="Sets"
              value={item.sets}
              onChangeText={(value) => patchItem(index, { sets: value })}
              keyboardType="number-pad"
            />
            <Field
              label="Reps"
              value={item.reps}
              onChangeText={(value) => patchItem(index, { reps: value })}
              keyboardType="number-pad"
            />
            <Field
              label="Rest (sec)"
              value={item.rest_seconds}
              onChangeText={(value) =>
                patchItem(index, { rest_seconds: value })
              }
              keyboardType="number-pad"
            />
          </View>
        </Card>
      ))}
      <Text style={styles.sectionLabel}>ADD EXERCISE</Text>
      {library.length ? (
        <View style={styles.libraryRows}>
          {library.map((exercise) => (
            <Pressable
              key={exercise.id}
              style={styles.addExercise}
              onPress={() => addExercise(exercise)}
            >
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.muted}>{exercise.muscle} · Add +</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Card>
          <Text style={styles.muted}>
            Add exercises to your library before creating a workout.
          </Text>
          <Button
            title="Add exercise"
            variant="secondary"
            onPress={() => router.push("/exercise/new")}
          />
        </Card>
      )}
      <InlineError>{error}</InlineError>
      <Button
        title={workoutId ? "Save changes" : "Create workout"}
        onPress={() => void save()}
      />
      <Button
        title="Cancel"
        variant="secondary"
        onPress={() => router.back()}
      />
      {workoutId ? (
        <Button
          title="Delete workout"
          variant="danger"
          onPress={deleteTemplate}
        />
      ) : null}
    </Screen>
  );
}
function toDraft(item: WorkoutExercise): Draft {
  return {
    exercise_id: item.exercise_id,
    name: item.name,
    muscle: item.muscle,
    sets: String(item.sets),
    reps: String(item.reps),
    rest_seconds: String(item.rest_seconds),
  };
}
const styles = StyleSheet.create({
  exerciseInfo: { flex: 1, gap: spacing.xs },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "800",
  },
  muted: { color: colors.textSecondary, fontSize: typography.caption },
  icon: { color: colors.textPrimary, fontSize: 20 },
  remove: { color: colors.danger, fontSize: 24 },
  fields: { flexDirection: "row", gap: spacing.sm },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  libraryRows: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  addExercise: {
    minHeight: 60,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: "center",
    gap: spacing.xs,
  },
});

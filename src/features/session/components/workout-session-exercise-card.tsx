import { Card, sharedStyles } from "@/components/ui";
import { Session, SessionExercise } from "@/db/queries";
import { SessionExerciseDropdownActions } from "@/features/session/components/session-exercise-dropdown-actions";
import { useWorkoutSession } from "@/features/session/hooks/use-workout-session";
import { colors, radius, spacing, typography } from "@/theme/colors";
import { useLocalSearchParams } from "expo-router";
import { Dispatch, SetStateAction } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export function WorkoutSessionExerciseCard({
  exercise,
  setRemoveExerciseTarget,
  session,
}: {
  exercise: SessionExercise;
  setRemoveExerciseTarget: Dispatch<SetStateAction<SessionExercise | null>>;
  session: Session;

  actions: object;
}) {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(rawId);
  const { actions } = useWorkoutSession(sessionId);

  if (!session) throw new Error("a session is required");

  return (
    <Card>
      <View style={sharedStyles.spread}>
        <View>
          <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
          <Text style={styles.secondary}>{exercise.muscle}</Text>
        </View>
        <SessionExerciseDropdownActions
          exercise={exercise}
          sessionId={session.id}
          disabled={session.status !== "in_progress"}
          onAddSet={(target) => {
            void actions.addSet(target, target.sets.at(-1)?.weight ?? null);
          }}
          onRemoveSet={(target) => void actions.removeSet(target)}
          onRemoveExercise={setRemoveExerciseTarget}
        />
      </View>
      <View style={styles.setHeader}>
        <Text style={[styles.tableHead, styles.numberCol]}>SET</Text>
        <Text style={[styles.tableHead, styles.repsCol]}>TARGET</Text>
        <Text style={[styles.tableHead, styles.weightCol]}>WEIGHT (KG)</Text>
        <Text style={[styles.tableHead, styles.checkCol]}>DONE</Text>
      </View>
      {exercise.sets.map((set) => (
        <View
          key={set.id}
          style={[styles.setRow, set.completed ? styles.completedRow : null]}
        >
          <Text style={[styles.value, styles.numberCol]}>{set.set_number}</Text>
          <TextInput
            accessibilityLabel={`Target reps for set ${set.set_number}`}
            value={actions.reps[set.id] ?? String(set.target_reps)}
            keyboardType="number-pad"
            editable={session.status === "in_progress"}
            onChangeText={(value) => actions.setReps(set.id, value)}
            onBlur={() => {
              actions.saveReps(
                set.id,
                actions.reps[set.id] ?? String(set.target_reps),
                set.target_reps,
              );
            }}
            style={[styles.weightInput, styles.repsCol]}
          />
          <TextInput
            accessibilityLabel={`Weight for set ${set.set_number}`}
            value={actions.weights[set.id] ?? ""}
            onChangeText={(value) => {
              actions.setWeight(set.id, value);
            }}
            onBlur={() => {
              void actions.saveWeight(set.id, Boolean(set.completed));
            }}
            placeholder="—"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            style={styles.weightInput}
            editable={session.status === "in_progress"}
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: Boolean(set.completed) }}
            disabled={session.status !== "in_progress"}
            onPress={() => {
              void actions.toggleSet(
                set.id,
                Boolean(set.completed),
                exercise.rest_seconds,
              );
            }}
            style={[styles.checkbox, set.completed ? styles.checked : null]}
          >
            <Text style={styles.checkmark}>{set.completed ? "✓" : ""}</Text>
          </Pressable>
        </View>
      ))}
    </Card>
  );
}
const styles = StyleSheet.create({
  secondary: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: 2,
  },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "800",
  },
  setHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.md,
  },
  setRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  completedRow: { opacity: 0.65 },
  tableHead: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  value: {
    color: colors.textPrimary,
    fontSize: typography.caption,
    textAlign: "center",
  },
  numberCol: { width: "13%" },
  repsCol: { width: "25%" },
  weightCol: { width: "42%" },
  checkCol: { width: "20%" },
  weightInput: {
    width: "42%",
    minHeight: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    color: colors.textPrimary,
    textAlign: "center",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  checkbox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: "auto",
  },
  checked: { backgroundColor: colors.success, borderColor: colors.success },
  checkmark: { color: colors.textOnPrimary, fontSize: 18, fontWeight: "900" },
});

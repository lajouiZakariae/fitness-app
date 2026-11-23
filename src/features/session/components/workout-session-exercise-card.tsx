import { Card, sharedStyles } from "@/components/ui";
import { SessionExercise } from "@/db/queries";
import { SessionExerciseDropdownActions } from "@/features/session/components/session-exercise-dropdown-actions";
import { useWorkoutSession } from "@/features/session/hooks/use-workout-session";
import { colors, radius, spacing, typography } from "@/theme/colors";
import { useLocalSearchParams } from "expo-router";
import { Dispatch, SetStateAction } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export function WorkoutSessionExerciseCard({
  exercise,
  setRemoveExerciseTarget,
}: {
  exercise: SessionExercise;
  setRemoveExerciseTarget: Dispatch<SetStateAction<SessionExercise | null>>;
}) {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(rawId);
  const { session, actions } = useWorkoutSession(sessionId);

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
  root: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.sm },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  back: { width: 48, height: 48, justifyContent: "center" },
  headerTextContainer: { flex: 1, flexDirection: "row" },
  headerText: { flex: 1 },
  title: {
    color: colors.textPrimary,
    fontSize: typography.heading,
    fontWeight: "800",
  },
  secondary: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: 2,
  },
  scroll: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "800",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
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
  timerDock: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  timerLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: "800",
  },
  timerValue: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "800",
  },
  skip: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: "800",
    minWidth: 48,
    textAlign: "right",
  },
  timerTrack: {
    height: 6,
    borderRadius: radius.pill,
    overflow: "hidden",
    backgroundColor: colors.primaryMuted,
  },
  timerProgress: { height: "100%", backgroundColor: colors.primary },
  fab: {
    position: "absolute",
    right: spacing.lg,
    zIndex: 5,
    height: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabDisabled: { opacity: 0.5 },
  fabText: {
    color: colors.textOnPrimary,
    fontSize: typography.body,
    fontWeight: "800",
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
});

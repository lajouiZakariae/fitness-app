import { Button } from "@/components/ui";
import { SessionExercise } from "@/db/queries";
import { colors, radius, spacing, typography } from "@/theme/colors";
import { Dispatch, SetStateAction } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function RemoveExerciseModal({
  removeExerciseTarget,
  setRemoveExerciseTarget,
  confirmRemoveExercise,
  removeExercisePending,
}: {
  removeExerciseTarget: SessionExercise | null;
  setRemoveExerciseTarget: Dispatch<SetStateAction<SessionExercise | null>>;
  removeExercisePending: boolean;
  confirmRemoveExercise: () => Promise<void>;
}) {
  return removeExerciseTarget ? (
      <View style={styles.dialogShade} accessibilityViewIsModal>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel removing exercise"
          disabled={removeExercisePending}
          onPress={() => setRemoveExerciseTarget(null)}
          style={styles.backdrop}
        />
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>Remove exercise?</Text>
          <Text style={styles.secondary}>
            Remove {removeExerciseTarget.exercise_name} and its sets from this workout session?
          </Text>
          <View style={styles.dialogActions}>
            <Button
              title="Cancel"
              variant="secondary"
              disabled={removeExercisePending}
              onPress={() => setRemoveExerciseTarget(null)}
            />
            <Button
              title={removeExercisePending ? "Removing..." : "Remove"}
              variant="danger"
              disabled={removeExercisePending}
              onPress={() => void confirmRemoveExercise()}
            />
          </View>
        </View>
      </View>
  ) : null;
}

const styles = StyleSheet.create({
  secondary: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: 2,
  },
  dialogShade: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    justifyContent: "center",
    padding: spacing.lg,
  },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  dialog: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  dialogTitle: {
    color: colors.textPrimary,
    fontSize: typography.heading,
    fontWeight: "800",
  },
  dialogActions: { flexDirection: "row", gap: spacing.sm },
});

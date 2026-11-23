import { Button } from "@/components/ui";
import { colors, radius, spacing, typography } from "@/theme/colors";
import { Dispatch, SetStateAction } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { SessionExercise } from "../types";

export default function RemoveExerciseModal({
  removeExerciseTarget,
  setRemoveExerciseTarget,
  confirmRemoveExercise,
  removeExercisePending,
}: {
  removeExerciseTarget: SessionExercise;
  setRemoveExerciseTarget: Dispatch<SetStateAction<SessionExercise>>;
  removeExercisePending: boolean;
  confirmRemoveExercise: () => Promise<void>;
}) {
  return (
    <Modal
      visible={removeExerciseTarget !== null}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!removeExercisePending) setRemoveExerciseTarget(null);
      }}
    >
      <View style={styles.dialogShade}>
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>Remove exercise?</Text>
          <Text style={styles.secondary}>
            Remove {removeExerciseTarget?.exercise_name ?? "this exercise"} and
            its sets from this workout session?
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  secondary: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: 2,
  },
  dialogShade: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.overlay,
  },
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

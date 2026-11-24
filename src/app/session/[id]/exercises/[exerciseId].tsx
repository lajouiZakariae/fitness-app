import { Button, Card, InlineError, Screen } from "@/components/ui";
import { useWorkoutSession } from "@/features/session/hooks/use-workout-session";
import { colors, radius, spacing, typography } from "@/theme/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function SessionExerciseDetailsScreen() {
  const { id: rawSessionId, exerciseId: rawExerciseId } =
    useLocalSearchParams<{ id: string; exerciseId: string }>();
  const sessionId = Number(rawSessionId);
  const exerciseId = Number(rawExerciseId);
  const { session, phase, actions } = useWorkoutSession(sessionId);
  const exercise = session?.exercises.find((item) => item.id === exerciseId);

  if (phase === "loading")
    return <Screen><Text style={styles.muted}>Loading exercise…</Text></Screen>;
  if (phase === "error" || !session || !exercise)
    return (
      <Screen>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          <Text style={styles.muted}>Back to session</Text>
        </Pressable>
        <InlineError>{phase === "error" ? actions.loadError : "This exercise is no longer in the session."}</InlineError>
        {phase === "error" ? <Button title="Retry" variant="secondary" onPress={actions.retry} /> : null}
      </Screen>
    );

  const editable = session.status === "in_progress";

  return (
    <Screen scroll style={styles.screen}>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        <Text style={styles.muted}>Session</Text>
      </Pressable>
      <View style={styles.heading}>
        <Text style={styles.title}>{exercise.exercise_name}</Text>
        <Text style={styles.muted}>{exercise.muscle}</Text>
      </View>
      <InlineError>{actions.actionError}</InlineError>

      <Card style={styles.card}>
        <View style={styles.columns}>
          <Text style={[styles.label, styles.setCol]}>SET</Text>
          <Text style={[styles.label, styles.repsCol]}>REPS</Text>
          <Text style={[styles.label, styles.weightCol]}>WEIGHT (KG)</Text>
          <Text style={[styles.label, styles.doneCol]}>DONE</Text>
        </View>
        {exercise.sets.map((set) => (
          <View key={set.id} style={styles.setRow}>
            <Text style={[styles.value, styles.setCol]}>{set.set_number}</Text>
            <TextInput
              accessibilityLabel={`Target reps for set ${set.set_number}`}
              value={actions.reps[set.id] ?? String(set.target_reps)}
              editable={editable}
              keyboardType="number-pad"
              onChangeText={(value) => actions.setReps(set.id, value)}
              onBlur={() => actions.saveReps(set.id, actions.reps[set.id] ?? String(set.target_reps), set.target_reps)}
              style={[styles.input, styles.repsCol]}
            />
            <TextInput
              accessibilityLabel={`Weight for set ${set.set_number}`}
              value={actions.weights[set.id] ?? ""}
              editable={editable}
              keyboardType="decimal-pad"
              onChangeText={(value) => actions.setWeight(set.id, value)}
              onBlur={() => void actions.saveWeight(set.id, Boolean(set.completed))}
              placeholder="—"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, styles.weightCol]}
            />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: Boolean(set.completed) }}
              accessibilityLabel={`Set ${set.set_number} complete`}
              disabled={!editable}
              onPress={() => void actions.toggleSet(set.id, Boolean(set.completed), exercise.rest_seconds)}
              style={[styles.checkbox, set.completed ? styles.checked : null]}
            >
              {set.completed ? <Ionicons name="checkmark" size={18} color={colors.textOnPrimary} /> : null}
            </Pressable>
          </View>
        ))}
      </Card>

      {editable ? (
        <View style={styles.setActions}>
          <Button title="Add set" variant="secondary" onPress={() => void actions.addSet(exercise, exercise.sets.at(-1)?.weight ?? null)} />
          <Button title="Remove last set" variant="secondary" disabled={!exercise.sets.length} onPress={() => void actions.removeSet(exercise)} />
        </View>
      ) : null}
      <Text style={styles.hint}>Changes save automatically when you finish editing a field.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md },
  back: { flexDirection: "row", alignItems: "center", gap: spacing.xs, minHeight: 44 },
  heading: { gap: spacing.xs, paddingVertical: spacing.sm },
  title: { color: colors.textPrimary, fontSize: typography.heading, fontWeight: "800" },
  muted: { color: colors.textSecondary, fontSize: typography.caption },
  card: { paddingHorizontal: spacing.md },
  columns: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  setRow: { minHeight: 58, flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.xs },
  label: { color: colors.textSecondary, fontSize: 10, fontWeight: "800", textAlign: "center" },
  value: { color: colors.textPrimary, fontSize: typography.caption, textAlign: "center" },
  setCol: { width: "12%" },
  repsCol: { width: "24%" },
  weightCol: { width: "39%" },
  doneCol: { flex: 1 },
  input: { minHeight: 42, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceElevated, color: colors.textPrimary, paddingHorizontal: spacing.xs, textAlign: "center" },
  checkbox: { width: 34, height: 34, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center", flex: 1, maxWidth: 42 },
  checked: { backgroundColor: colors.success, borderColor: colors.success },
  setActions: { gap: spacing.sm },
  hint: { color: colors.textSecondary, fontSize: typography.caption, textAlign: "center", paddingVertical: spacing.sm },
});

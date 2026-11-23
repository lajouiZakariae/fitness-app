import { IconButton } from "@/components/icon-button";
import { RouteError } from "@/components/route-error";
import { Button, Card, InlineError, sharedStyles } from "@/components/ui";
import { ErrorWorkoutSession } from "@/features/session/components/error-workout-session";
import { LoadingWorkoutSession } from "@/features/session/components/loading-workout-session";
import { NotFoundWorkoutSession } from "@/features/session/components/not-found-workout-session";
import { SessionExerciseDropdownActions } from "@/features/session/components/session-exercise-dropdown-actions";
import { useWorkoutSession } from "@/features/session/hooks/use-workout-session";
import { colors, radius, spacing, typography } from "@/theme/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useKeepAwake } from "expo-keep-awake";
import type { ErrorBoundaryProps } from "expo-router";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <RouteError {...props} />;
}

export default function WorkoutSessionScreen() {
  useKeepAwake();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(rawId);
  const { session, phase, actions } = useWorkoutSession(sessionId);
  const insets = useSafeAreaInsets();
  const [removeExerciseTarget, setRemoveExerciseTarget] = useState<
    NonNullable<typeof session>["exercises"][number] | null
  >(null);

  const confirmRemoveExercise = async () => {
    if (await actions.removeExercise(removeExerciseTarget))
      setRemoveExerciseTarget(null);
  };

  if (phase === "loading")
    return <LoadingWorkoutSession message={actions.loadingMessage} />;

  if (phase === "error")
    return (
      <ErrorWorkoutSession
        loadError={actions.loadError}
        goHome={actions.goHome}
        retry={actions.retry}
        validSessionId={actions.validSessionId}
      />
    );

  if (!session) return <NotFoundWorkoutSession goHome={actions.goHome} />;

  return (
    <View style={[styles.root, { paddingTop: spacing.sm + insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {session.workout_name}
            </Text>

            <Text style={styles.secondary}>
              {actions.completed} / {actions.total} sets completed
            </Text>
          </View>
          <IconButton
            icon="trash-outline"
            label="Delete workout session"
            danger
            onPress={actions.deleteSession}
          />
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progress,
            {
              width: `${actions.total ? (actions.completed / actions.total) * 100 : 0}%`,
            },
          ]}
        />
      </View>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <InlineError>{actions.actionError}</InlineError>
        <InlineError>
          {actions.timerPhase === "error" ? actions.timerError : undefined}
        </InlineError>
        {actions.timerPhase === "loading" ? (
          <Text style={styles.secondary}>Updating rest timer…</Text>
        ) : null}
        {actions.timerPhase === "error" ? (
          <Button
            title="Retry timer update"
            variant="secondary"
            onPress={() => {
              void actions.clearExpiredTimer();
            }}
          />
        ) : null}
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {session.exercises.map((exercise) => (
          <Card key={exercise.id}>
            <View style={sharedStyles.spread}>
              <View>
                <Text style={styles.exerciseName}>
                  {exercise.exercise_name}
                </Text>
                <Text style={styles.secondary}>{exercise.muscle}</Text>
              </View>
              <SessionExerciseDropdownActions
                exercise={exercise}
                sessionId={session.id}
                disabled={session.status !== "in_progress"}
                onAddSet={(target) => {
                  void actions.addSet(
                    target,
                    target.sets.at(-1)?.weight ?? null,
                  );
                }}
                onRemoveSet={(target) => void actions.removeSet(target)}
                onRemoveExercise={setRemoveExerciseTarget}
              />
            </View>
            <View style={styles.setHeader}>
              <Text style={[styles.tableHead, styles.numberCol]}>SET</Text>
              <Text style={[styles.tableHead, styles.repsCol]}>TARGET</Text>
              <Text style={[styles.tableHead, styles.weightCol]}>
                WEIGHT (KG)
              </Text>
              <Text style={[styles.tableHead, styles.checkCol]}>DONE</Text>
            </View>
            {exercise.sets.map((set) => (
              <View
                key={set.id}
                style={[
                  styles.setRow,
                  set.completed ? styles.completedRow : null,
                ]}
              >
                <Text style={[styles.value, styles.numberCol]}>
                  {set.set_number}
                </Text>
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
                  style={[
                    styles.checkbox,
                    set.completed ? styles.checked : null,
                  ]}
                >
                  <Text style={styles.checkmark}>
                    {set.completed ? "✓" : ""}
                  </Text>
                </Pressable>
              </View>
            ))}
          </Card>
        ))}
        <View style={{ height: 72 }} />
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add exercise"
        disabled={session.status !== "in_progress"}
        onPress={() =>
          router.push({
            pathname: "/session/add-exercise",
            params: { sessionId: String(session.id) },
          })
        }
        style={[
          styles.fab,
          {
            bottom:
              90 +
              insets.bottom +
              (session.rest_started_at && actions.timerRemaining > 0 ? 68 : 0),
          },
          session.status !== "in_progress" ? styles.fabDisabled : null,
        ]}
      >
        <Ionicons name="add" size={24} color={colors.textOnPrimary} />
      </Pressable>
      {session.rest_started_at && actions.timerRemaining > 0 ? (
        <View style={styles.timerDock}>
          <View style={sharedStyles.spread}>
            <Text style={styles.timerLabel}>REST</Text>
            <Text style={styles.timerValue}>
              {Math.floor(actions.timerRemaining / 60)}:
              {String(actions.timerRemaining % 60).padStart(2, "0")}
            </Text>
            <Pressable
              onPress={() => {
                void actions.skipRest();
              }}
            >
              <Text style={styles.skip}>Skip</Text>
            </Pressable>
          </View>
          <View style={styles.timerTrack}>
            <View
              style={[
                styles.timerProgress,
                {
                  width: `${Math.max(0, Math.min(100, (actions.timerRemaining / session.rest_duration_seconds) * 100))}%`,
                },
              ]}
            />
          </View>
        </View>
      ) : null}
      <View
        style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}
      >
        <Button
          title="Workout is completed"
          onPress={actions.finish}
          disabled={session.status !== "in_progress"}
        />
      </View>
      <Modal
        visible={removeExerciseTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!actions.removeExercisePending) setRemoveExerciseTarget(null);
        }}
      >
        <View style={styles.dialogShade}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Remove exercise?</Text>
            <Text style={styles.secondary}>
              Remove {removeExerciseTarget?.exercise_name ?? "this exercise"}{" "}
              and its sets from this workout session?
            </Text>
            <View style={styles.dialogActions}>
              <Button
                title="Cancel"
                variant="secondary"
                disabled={actions.removeExercisePending}
                onPress={() => setRemoveExerciseTarget(null)}
              />
              <Button
                title={actions.removeExercisePending ? "Removing..." : "Remove"}
                variant="danger"
                disabled={actions.removeExercisePending}
                onPress={() => void confirmRemoveExercise()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  progressTrack: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    height: 8,
    borderRadius: radius.pill,
    overflow: "hidden",
    backgroundColor: colors.primaryMuted,
  },
  progress: { height: "100%", backgroundColor: colors.primary },
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

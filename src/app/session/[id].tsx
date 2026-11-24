import { IconButton } from "@/components/icon-button";
import { RouteError } from "@/components/route-error";
import { Button, InlineError, sharedStyles } from "@/components/ui";
import { SessionExercise } from "@/db/queries";
import AddExerciseFAB from "@/features/session/components/add-exercise-fab";
import { ErrorWorkoutSession } from "@/features/session/components/error-workout-session";
import { LoadingWorkoutSession } from "@/features/session/components/loading-workout-session";
import { NotFoundWorkoutSession } from "@/features/session/components/not-found-workout-session";
import RemoveExerciseModal from "@/features/session/components/remove-exercise-modal";
import { WorkoutProgressBar } from "@/features/session/components/workout-progress-bar";
import { WorkoutSessionExerciseCard } from "@/features/session/components/workout-session-exercise-card";
import { useWorkoutSession } from "@/features/session/hooks/use-workout-session";
import { colors, fabHeight, radius, spacing, typography } from "@/theme/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useKeepAwake } from "expo-keep-awake";
import type { ErrorBoundaryProps } from "expo-router";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
  const [removeExerciseTarget, setRemoveExerciseTarget] =
    useState<SessionExercise | null>(null);

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

      <WorkoutProgressBar completed={actions.completed} total={actions.total} />

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
          <WorkoutSessionExerciseCard
            key={exercise.id}
            exercise={exercise}
            session={session}
            actions={actions}
            setRemoveExerciseTarget={setRemoveExerciseTarget}
          />
        ))}
        <View style={{ height: fabHeight }} />
      </ScrollView>

      <AddExerciseFAB
        session={session}
        timerRemaining={actions.timerRemaining}
      />

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
      <RemoveExerciseModal
        confirmRemoveExercise={confirmRemoveExercise}
        removeExercisePending={actions.removeExercisePending}
        removeExerciseTarget={removeExerciseTarget}
        setRemoveExerciseTarget={setRemoveExerciseTarget}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.sm },

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
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
});

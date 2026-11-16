import { IconButton } from "@/components/icon-button";
import { RouteError } from "@/components/route-error";
import { Button, Card, InlineError, sharedStyles } from "@/components/ui";
import {
  addSessionSet,
  clearRestTimer,
  completeSession,
  deleteSession,
  getSession,
  removeSessionSet,
  removeSessionExercise,
  setRestTimer,
  updateSet,
  type Session,
} from "@/db/queries";
import { useSessionStore } from "@/store/session-store";
import { colors, radius, spacing, typography } from "@/theme/colors";
import { useKeepAwake } from "expo-keep-awake";
import type { ErrorBoundaryProps } from "expo-router";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
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
  const db = useSQLiteContext();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(rawId);
  const validSessionId =
    !isNaN(sessionId) && Number.isInteger(sessionId) && sessionId > 0;
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<"loading" | "error" | "success">(
    "loading",
  );
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [timerError, setTimerError] = useState("");
  const [timerPhase, setTimerPhase] = useState<"loading" | "error" | "success">(
    "success",
  );
  const [loadingMessage, setLoadingMessage] = useState("Loading session…");
  const [retryKey, setRetryKey] = useState(0);
  const [now, setNow] = useState(0);
  const [weights, setWeights] = useState<Record<number, string>>({});
  const [removeExerciseTarget, setRemoveExerciseTarget] = useState<
    Session["exercises"][number] | null
  >(null);
  const [removeExercisePending, setRemoveExercisePending] = useState(false);
  const setActiveSessionId = useSessionStore(
    (state) => state.setActiveSessionId,
  );
  const refresh = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      const next = await getSession(db, sessionId);
      if (isCancelled()) return;
      setSession(next);
      if (next) {
        setWeights((current) => {
          const updated = { ...current };
          for (const exercise of next.exercises)
            for (const set of exercise.sets)
              if (updated[set.id] === undefined)
                updated[set.id] = set.weight == null ? "" : String(set.weight);
          return updated;
        });
        setActiveSessionId(next.status === "in_progress" ? next.id : null);
      } else setActiveSessionId(null);
      return next;
    },
    [db, sessionId, setActiveSessionId],
  );
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setPhase("loading");
      setLoadingMessage(
        retryKey ? "Retrying session load…" : "Loading session…",
      );
      setLoadError("");
      if (!validSessionId) {
        setLoadError("Invalid session ID.");
        setPhase("error");
        return () => {
          cancelled = true;
        };
      }
      const load = async () => {
        try {
          const next = await refresh(() => cancelled);
          if (!cancelled) {
            if (next) setPhase("success");
            else {
              setLoadError("Session not found.");
              setPhase("error");
            }
          }
        } catch (error) {
          console.error("Could not load the session.", error);
          if (!cancelled) {
            setLoadError("Could not load this workout session.");
            setPhase("error");
          }
        }
      };
      void load();
      return () => {
        cancelled = true;
      };
    }, [refresh, retryKey, validSessionId]),
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  const total = useMemo(
    () =>
      session?.exercises.reduce(
        (sum, exercise) => sum + exercise.sets.length,
        0,
      ) ?? 0,
    [session],
  );
  const completed = useMemo(
    () =>
      session?.exercises.reduce(
        (sum, exercise) =>
          sum + exercise.sets.filter((set) => set.completed).length,
        0,
      ) ?? 0,
    [session],
  );
  const timerRemaining = session?.rest_started_at
    ? Math.min(
        session.rest_duration_seconds,
        Math.max(
          0,
          session.rest_duration_seconds -
            Math.floor((now - Date.parse(session.rest_started_at)) / 1000),
        ),
      )
    : 0;
  const clearExpiredTimer = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      if (isCancelled()) return;
      setTimerPhase("loading");
      setTimerError("");
      try {
        await clearRestTimer(db, sessionId);
        await refresh(isCancelled);
        if (!isCancelled()) setTimerPhase("success");
      } catch (error) {
        console.error("Could not clear the expired rest timer.", error);
        if (!isCancelled()) {
          setTimerError("Could not update the rest timer.");
          setTimerPhase("error");
        }
      }
    },
    [db, refresh, sessionId],
  );
  useEffect(() => {
    if (session?.rest_started_at && timerRemaining === 0) {
      let cancelled = false;
      void Promise.resolve().then(() => clearExpiredTimer(() => cancelled));
      return () => {
        cancelled = true;
      };
    }
  }, [clearExpiredTimer, session, timerRemaining]);
  const toggleSet = async (
    setId: number,
    currentCompleted: boolean,
    rest: number,
  ) => {
    const raw = weights[setId]?.trim() ?? "";
    const value = raw ? Number(raw.replace(",", ".")) : null;
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      Alert.alert("Check the weight", "Enter a valid weight in kilograms.");
      return;
    }
    const nextCompleted = !currentCompleted;
    setActionError("");
    try {
      await updateSet(db, setId, nextCompleted, value);
      if (nextCompleted && rest > 0) await setRestTimer(db, sessionId, rest);
      else if (!nextCompleted && session?.rest_started_at)
        await clearRestTimer(db, sessionId);
      await refresh();
    } catch (error) {
      console.error("Could not update the set.", error);
      setActionError("Could not update this set. Please try again.");
    }
  };
  const save = async () => {
    setActionError("");
    try {
      await completeSession(db, sessionId);
      setActiveSessionId(null);
      router.replace("/(tabs)/home");
    } catch (error) {
      console.error("Could not finish the workout.", error);
      setActionError(
        "Could not finish the workout. Your session is still saved.",
      );
    }
  };
  const finish = () => {
    if (completed < total)
      Alert.alert(
        "Finish workout?",
        `${total - completed} set${total - completed === 1 ? "" : "s"} are unfinished. They will be saved as incomplete.`,
        [
          { text: "Keep training", style: "cancel" },
          {
            text: "Finish workout",
            onPress: () => {
              void save();
            },
          },
        ],
      );
    else void save();
  };
  const saveWeight = async (setId: number, completedValue: boolean) => {
    const raw = weights[setId]?.trim() ?? "";
    const value = raw ? Number(raw.replace(",", ".")) : null;
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      setActionError("Enter a valid weight in kilograms.");
      return;
    }
    setActionError("");
    try {
      await updateSet(db, setId, completedValue, value);
    } catch (error) {
      console.error("Could not save the set weight.", error);
      setActionError("Could not save the weight. Please try again.");
    }
  };
  const changeSetCount = async (
    operation: "add" | "remove",
    exercise: Session["exercises"][number],
  ) => {
    setActionError("");
    try {
      if (operation === "add") await addSessionSet(db, exercise);
      else await removeSessionSet(db, exercise);
      await refresh();
    } catch (error) {
      console.error(`Could not ${operation} a session set.`, error);
      setActionError(`Could not ${operation} a set. Please try again.`);
    }
  };
  const confirmRemoveExercise = async () => {
    if (!session || !removeExerciseTarget || removeExercisePending) return;
    setRemoveExercisePending(true);
    setActionError("");
    try {
      await removeSessionExercise(db, session, removeExerciseTarget.id);
      setRemoveExerciseTarget(null);
      await refresh();
    } catch (error) {
      console.error("Could not remove the session exercise.", error);
      setActionError("Could not remove this exercise. Please try again.");
    } finally {
      setRemoveExercisePending(false);
    }
  };
  const confirmDeleteSession = () => {
    Alert.alert(
      "Delete workout session?",
      "This will permanently delete this session and all of its recorded sets.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete session",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setActionError("");
              try {
                await deleteSession(db, sessionId);
                setActiveSessionId(null);
                router.replace("/(tabs)/home");
              } catch (error) {
                console.error("Could not delete the workout session.", error);
                setActionError(
                  "Could not delete this workout session. Please try again.",
                );
              }
            })();
          },
        },
      ],
    );
  };
  const skipRest = async () => {
    setActionError("");
    try {
      await clearRestTimer(db, sessionId);
      await refresh();
    } catch (error) {
      console.error("Could not skip the rest timer.", error);
      setActionError("Could not skip the rest timer. Please try again.");
    }
  };
  if (phase === "loading")
    return (
      <View style={styles.center}>
        <Text style={styles.secondary}>{loadingMessage}</Text>
      </View>
    );
  if (phase === "error")
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Session unavailable</Text>
        <Text style={styles.secondary}>{loadError}</Text>
        {validSessionId ? (
          <Button title="Retry" onPress={() => setRetryKey((key) => key + 1)} />
        ) : null}
        <Button
          title="Go home"
          variant="secondary"
          onPress={() => router.replace("/(tabs)/home")}
        />
      </View>
    );
  if (!session)
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Session unavailable</Text>
        <Button
          title="Go home"
          onPress={() => router.replace("/(tabs)/home")}
        />
      </View>
    );
  return (
    <View style={[styles.root, { paddingTop: spacing.sm + insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerTextContainer}>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {session.workout_name}
            </Text>

            <Text style={styles.secondary}>
              {completed} / {total} sets completed
            </Text>
          </View>
          <IconButton
            icon="trash-outline"
            label="Delete workout session"
            danger
            onPress={confirmDeleteSession}
          />
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progress,
            { width: `${total ? (completed / total) * 100 : 0}%` },
          ]}
        />
      </View>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <InlineError>{actionError}</InlineError>
        <InlineError>
          {timerPhase === "error" ? timerError : undefined}
        </InlineError>
        {timerPhase === "loading" ? (
          <Text style={styles.secondary}>Updating rest timer…</Text>
        ) : null}
        {timerPhase === "error" ? (
          <Button
            title="Retry timer update"
            variant="secondary"
            onPress={() => {
              void clearExpiredTimer();
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
              <View style={sharedStyles.row}>
                <IconButton
                  icon="swap-horizontal"
                  label={`Change ${exercise.exercise_name}`}
                  disabled={session.status !== "in_progress"}
                  onPress={() =>
                    router.push({
                      pathname: "/session/add-exercise",
                      params: {
                        sessionId: String(session.id),
                        replaceId: String(exercise.id),
                      },
                    })
                  }
                />
                <IconButton
                  icon="remove"
                  label="Remove a set"
                  disabled={
                    session.status !== "in_progress" ||
                    exercise.sets.length === 0
                  }
                  onPress={() => {
                    void changeSetCount("remove", exercise);
                  }}
                />
                <IconButton
                  icon="add"
                  label="Add a set"
                  disabled={session.status !== "in_progress"}
                  onPress={() => {
                    void changeSetCount("add", exercise);
                  }}
                />
                <IconButton
                  icon="trash-outline"
                  label={`Remove ${exercise.exercise_name} from session`}
                  danger
                  disabled={session.status !== "in_progress"}
                  onPress={() => setRemoveExerciseTarget(exercise)}
                />
              </View>
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
                <Text style={[styles.value, styles.repsCol]}>
                  {set.target_reps} reps
                </Text>
                <TextInput
                  accessibilityLabel={`Weight for set ${set.set_number}`}
                  value={weights[set.id] ?? ""}
                  onChangeText={(value) => {
                    setWeights((current) => ({ ...current, [set.id]: value }));
                  }}
                  onBlur={() => {
                    void saveWeight(set.id, Boolean(set.completed));
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
                    void toggleSet(
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
        <Button
          title="Add exercise"
          variant="secondary"
          disabled={session.status !== "in_progress"}
          onPress={() =>
            router.push({
              pathname: "/session/add-exercise",
              params: { sessionId: String(session.id) },
            })
          }
        />
      </ScrollView>
      {session.rest_started_at && timerRemaining > 0 ? (
        <View style={styles.timerDock}>
          <View style={sharedStyles.spread}>
            <Text style={styles.timerLabel}>REST</Text>
            <Text style={styles.timerValue}>
              {Math.floor(timerRemaining / 60)}:
              {String(timerRemaining % 60).padStart(2, "0")}
            </Text>
            <Pressable
              onPress={() => {
                void skipRest();
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
                  width: `${Math.max(0, Math.min(100, (timerRemaining / session.rest_duration_seconds) * 100))}%`,
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
          onPress={finish}
          disabled={session.status !== "in_progress"}
        />
      </View>
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
                title={removeExercisePending ? "Removing…" : "Remove"}
                variant="danger"
                disabled={removeExercisePending}
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
  backText: { color: colors.textPrimary, fontSize: 38 },
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

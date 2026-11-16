import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useKeepAwake } from "expo-keep-awake";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, sharedStyles } from "@/components/ui";
import {
  addSessionSet,
  clearRestTimer,
  completeSession,
  getSession,
  removeSessionSet,
  setRestTimer,
  updateSet,
  type Session,
} from "@/db/queries";
import { useSessionStore } from "@/store/session-store";
import { colors, radius, spacing, typography } from "@/theme/colors";

export default function WorkoutSessionScreen() {
  useKeepAwake();
  const db = useSQLiteContext();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(rawId);
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [weights, setWeights] = useState<Record<number, string>>({});
  const setActiveSessionId = useSessionStore(
    (state) => state.setActiveSessionId,
  );
  const refresh = useCallback(async () => {
    const next = await getSession(db, sessionId);
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
    }
  }, [db, sessionId, setActiveSessionId]);
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void refresh().finally(() => setLoading(false));
    }, [refresh]),
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
  useEffect(() => {
    if (session?.rest_started_at && timerRemaining === 0)
      void clearRestTimer(db, session.id).then(refresh);
  }, [db, refresh, session, timerRemaining]);
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
    await updateSet(db, setId, nextCompleted, value);
    if (nextCompleted && rest > 0) await setRestTimer(db, sessionId, rest);
    else if (!nextCompleted && session?.rest_started_at)
      await clearRestTimer(db, sessionId);
    await refresh();
  };
  const finish = () => {
    const save = async () => {
      await completeSession(db, sessionId);
      setActiveSessionId(null);
      router.replace("/(tabs)/home");
    };
    if (completed < total)
      Alert.alert(
        "Finish workout?",
        `${total - completed} set${total - completed === 1 ? "" : "s"} are unfinished. They will be saved as incomplete.`,
        [
          { text: "Keep training", style: "cancel" },
          { text: "Finish workout", onPress: () => void save() },
        ],
      );
    else void save();
  };
  if (loading)
    return (
      <View style={styles.center}>
        <Text style={styles.secondary}>Loading session…</Text>
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
        <View style={styles.headerText}>
          <Text style={styles.title}>{session.workout_name}</Text>
          <Text style={styles.secondary}>
            {completed} / {total} sets completed
          </Text>
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
                <Pressable
                  accessibilityLabel="Remove a set"
                  disabled={
                    session.status !== "in_progress" ||
                    exercise.sets.length === 0
                  }
                  style={sharedStyles.smallButton}
                  onPress={() => {
                    void removeSessionSet(db, exercise).then(refresh);
                  }}
                >
                  <Text style={styles.actionText}>−</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Add a set"
                  disabled={session.status !== "in_progress"}
                  style={sharedStyles.smallButton}
                  onPress={() => {
                    void addSessionSet(db, exercise).then(refresh);
                  }}
                >
                  <Text style={styles.actionText}>+</Text>
                </Pressable>
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
                    const raw = value.trim();
                    const numeric = raw ? Number(raw.replace(",", ".")) : null;
                    if (
                      numeric === null ||
                      (Number.isFinite(numeric) && numeric >= 0)
                    )
                      void updateSet(
                        db,
                        set.id,
                        Boolean(set.completed),
                        numeric,
                      );
                  }}
                  onBlur={() => {
                    const raw = weights[set.id]?.trim() ?? "";
                    const value = raw ? Number(raw.replace(",", ".")) : null;
                    if (
                      value === null ||
                      (Number.isFinite(value) && value >= 0)
                    )
                      void updateSet(db, set.id, Boolean(set.completed), value);
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
                  onPress={() =>
                    void toggleSet(
                      set.id,
                      Boolean(set.completed),
                      exercise.rest_seconds,
                    )
                  }
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
              onPress={() => void clearRestTimer(db, sessionId).then(refresh)}
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
  actionText: { color: colors.primary, fontSize: 24, fontWeight: "700" },
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
});

import { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { IconButton } from "@/components/icon-button";
import {
  Button,
  Card,
  Heading,
  InlineError,
  Screen,
  sharedStyles,
} from "@/components/ui";
import {
  listExercises,
  listWorkouts,
  deleteExercise,
  type Exercise,
  type Workout,
} from "@/db/queries";
import { colors, radius, spacing, typography } from "@/theme/colors";

export default function LibraryScreen() {
  const db = useSQLiteContext();
  const [tab, setTab] = useState<"Exercises" | "Workouts">("Exercises");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [phase, setPhase] = useState<"loading" | "error" | "success">(
    "loading",
  );
  const [loadError, setLoadError] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("Loading your library…");
  const [retryKey, setRetryKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const [deletePhase, setDeletePhase] = useState<
    "confirm" | "pending" | "succeeded" | "error"
  >("confirm");
  const [deleteError, setDeleteError] = useState("");

  const closeDeleteDialog = () => {
    if (deletePhase !== "pending") {
      setDeleteTarget(null);
      setDeletePhase("confirm");
      setDeleteError("");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deletePhase === "pending") return;
    setDeletePhase("pending");
    setDeleteError("");
    try {
      await deleteExercise(db, deleteTarget.id);
      setExercises((current) =>
        current.filter((exercise) => exercise.id !== deleteTarget.id),
      );
      setDeletePhase("succeeded");
    } catch (error) {
      console.error("Could not delete exercise.", error);
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Could not delete the exercise. Please try again.",
      );
      setDeletePhase("error");
    }
  };
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setPhase("loading");
      setLoadingMessage(
        retryKey ? "Retrying library load…" : "Loading your library…",
      );
      setLoadError("");
      const load = async () => {
        try {
          const [nextExercises, nextWorkouts] = await Promise.all([
            listExercises(db),
            listWorkouts(db),
          ]);
          if (!cancelled) {
            setExercises(nextExercises);
            setWorkouts(nextWorkouts);
            setPhase("success");
          }
        } catch (error) {
          console.error("Could not load the library.", error);
          if (!cancelled) {
            setLoadError("Could not load your library.");
            setPhase("error");
          }
        }
      };
      void load();
      return () => {
        cancelled = true;
      };
    }, [db, retryKey]),
  );
  if (phase === "loading")
    return (
      <Screen>
        <Heading>Library</Heading>
        <Text style={styles.detail}>{loadingMessage}</Text>
      </Screen>
    );
  if (phase === "error")
    return (
      <Screen>
        <Heading>Library</Heading>
        <InlineError>{loadError}</InlineError>
        <Button title="Retry" onPress={() => setRetryKey((key) => key + 1)} />
      </Screen>
    );
  const items = tab === "Exercises" ? exercises : workouts;
  return (
    <Screen scroll>
      <Heading subtitle="Your training library">Library</Heading>
      <View style={styles.segment}>
        {(["Exercises", "Workouts"] as const).map((value) => (
          <Pressable
            key={value}
            style={[
              styles.segmentButton,
              tab === value ? styles.segmentActive : null,
            ]}
            onPress={() => setTab(value)}
          >
            <Text
              style={[
                styles.segmentText,
                tab === value ? styles.segmentTextActive : null,
              ]}
            >
              {value}
            </Text>
          </Pressable>
        ))}
      </View>
      {items.length ? (
        items.map((item) => (
          <Pressable
            key={`${tab}-${item.id}`}
            onPress={() =>
              tab === "Workouts" &&
              router.push({
                pathname: "/workout/[id]",
                params: { id: String(item.id) },
              })
            }
          >
            <Card style={sharedStyles.spread}>
              <View style={styles.item}>
                <Text style={styles.name}>
                  {tab === "Exercises"
                    ? (item as Exercise).name
                    : (item as Workout).name}
                </Text>
                <Text style={styles.detail}>
                  {tab === "Exercises"
                    ? (item as Exercise).muscle
                    : `${(item as Workout).exercise_count} exercises`}
                </Text>
              </View>
              {tab === "Exercises" ? (
                <IconButton
                  icon="trash-outline"
                  label={`Delete ${(item as Exercise).name}`}
                  danger
                  onPress={() => {
                    setDeleteTarget(item as Exercise);
                    setDeletePhase("confirm");
                    setDeleteError("");
                  }}
                />
              ) : null}
              {tab === "Workouts" ? (
                <Text style={styles.chevron}>›</Text>
              ) : null}
            </Card>
          </Pressable>
        ))
      ) : (
        <Card>
          <Text style={styles.name}>No {tab.toLowerCase()} yet</Text>
          <Text style={styles.detail}>
            {tab === "Exercises"
              ? "Add your first exercise to start building workouts."
              : "Create a workout from your exercise library."}
          </Text>
          <Button
            title={tab === "Exercises" ? "Add exercise" : "Add workout"}
            onPress={() =>
              router.push(
                tab === "Exercises" ? "/exercise/new" : "/workout/new",
              )
            }
          />
        </Card>
      )}
      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteDialog}
      >
        <View style={styles.dialogShade}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>
              {deletePhase === "succeeded"
                ? "Exercise deleted"
                : "Delete exercise?"}
            </Text>
            <Text style={styles.detail}>
              {deletePhase === "confirm" || deletePhase === "pending"
                ? `Delete ${deleteTarget?.name ?? "this exercise"}? This can't be undone.`
                : deletePhase === "succeeded"
                  ? `${deleteTarget?.name ?? "The exercise"} was deleted.`
                  : ""}
            </Text>
            {deletePhase === "error" ? (
              <InlineError>{deleteError}</InlineError>
            ) : null}
            {deletePhase === "pending" ? (
              <Text style={styles.detail}>Deleting exercise…</Text>
            ) : deletePhase === "succeeded" ? (
              <Button title="Done" onPress={closeDeleteDialog} />
            ) : deletePhase === "error" ? (
              <View style={styles.dialogActions}>
                <Button
                  title="Close"
                  variant="secondary"
                  onPress={closeDeleteDialog}
                />
                {deleteError.startsWith("You can't delete") ? null : (
                  <Button
                    title="Try again"
                    variant="danger"
                    onPress={confirmDelete}
                  />
                )}
              </View>
            ) : (
              <View style={styles.dialogActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={closeDeleteDialog}
                />
                <Button
                  title="Delete"
                  variant="danger"
                  onPress={confirmDelete}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
const styles = StyleSheet.create({
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: colors.surfaceElevated },
  segmentText: { color: colors.textSecondary, fontWeight: "700" },
  segmentTextActive: { color: colors.textPrimary },
  item: { flex: 1, gap: spacing.xs },
  name: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "800",
  },
  detail: { color: colors.textSecondary, fontSize: typography.caption },
  chevron: { color: colors.primary, fontSize: 30 },
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

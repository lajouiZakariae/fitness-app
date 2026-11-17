import { useCallback, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
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
import { deleteSession, listCompletedSessions } from "@/db/queries";
import { colors, radius, spacing, typography } from "@/theme/colors";

type CompletedSession = Awaited<ReturnType<typeof listCompletedSessions>>[number];

export default function SessionsScreen() {
  const db = useSQLiteContext();
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [phase, setPhase] = useState<"loading" | "error" | "success">(
    "loading",
  );
  const [retryKey, setRetryKey] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading completed sessions…",
  );
  const [deleteTarget, setDeleteTarget] = useState<CompletedSession | null>(null);
  const [deletePhase, setDeletePhase] = useState<"confirm" | "pending" | "error">(
    "confirm",
  );
  const [deleteError, setDeleteError] = useState("");
  const [loadError, setLoadError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setPhase("loading");
      setLoadingMessage(
        retryKey ? "Retrying completed sessions…" : "Loading completed sessions…",
      );
      setLoadError("");
      void listCompletedSessions(db)
        .then((result) => {
          if (!cancelled) {
            setSessions(result);
            setPhase("success");
          }
        })
        .catch((error: unknown) => {
          console.error("Could not load completed sessions.", error);
          if (!cancelled) {
            setLoadError("Could not load completed sessions.");
            setPhase("error");
          }
        });
      return () => {
        cancelled = true;
      };
    }, [db, retryKey]),
  );

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
      await deleteSession(db, deleteTarget.id);
      setSessions((current) =>
        current.filter((session) => session.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
      setDeletePhase("confirm");
    } catch (error) {
      console.error("Could not delete completed session.", error);
      setDeleteError("Could not delete this session. Please try again.");
      setDeletePhase("error");
    }
  };

  if (phase === "loading")
    return (
      <Screen>
        <Heading>Completed sessions</Heading>
        <Text style={styles.detail}>{loadingMessage}</Text>
      </Screen>
    );

  if (phase === "error")
    return (
      <Screen>
        <Heading>Completed sessions</Heading>
        <InlineError>{loadError}</InlineError>
        <Button title="Retry" onPress={() => setRetryKey((key) => key + 1)} />
      </Screen>
    );

  return (
    <Screen scroll>
      <Heading subtitle="Your workout history">Completed sessions</Heading>
      {sessions.length ? (
        sessions.map((session) => (
          <Card key={session.id} style={sharedStyles.spread}>
            <View style={styles.sessionInfo}>
              <Text style={styles.name}>{session.workout_name}</Text>
              <Text style={styles.detail}>
                {session.completed_sets} {session.completed_sets === 1 ? "set" : "sets"} done
              </Text>
              <Text style={styles.detail}>{formatDate(session.completed_at)}</Text>
            </View>
            <IconButton
              icon="trash-outline"
              label={`Delete ${session.workout_name} session`}
              danger
              onPress={() => {
                setDeleteTarget(session);
                setDeletePhase("confirm");
                setDeleteError("");
              }}
            />
          </Card>
        ))
      ) : (
        <Card>
          <Text style={styles.name}>No completed sessions yet</Text>
          <Text style={styles.detail}>
            Finished workouts will show up here.
          </Text>
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
            <Text style={styles.dialogTitle}>Delete session?</Text>
            <Text style={styles.detail}>
              Delete {deleteTarget?.workout_name ?? "this session"} and all its recorded sets? This can’t be undone.
            </Text>
            {deleteError ? <InlineError>{deleteError}</InlineError> : null}
            {deletePhase === "pending" ? (
              <Text style={styles.detail}>Deleting session…</Text>
            ) : (
              <View style={styles.dialogActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={closeDeleteDialog}
                />
                <Button
                  title={deletePhase === "error" ? "Try again" : "Delete"}
                  variant="danger"
                  onPress={() => void confirmDelete()}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

const styles = StyleSheet.create({
  sessionInfo: { flex: 1, gap: spacing.xs },
  name: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "800",
  },
  detail: { color: colors.textSecondary, fontSize: typography.caption },
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

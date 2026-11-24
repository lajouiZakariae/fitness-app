import { Session } from "@/db/queries";
import { colors, fabHeight, radius, spacing } from "@/theme/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AddExerciseFAB({
  session,
  timerRemaining,
}: {
  session: Session;
  timerRemaining: number;
}) {
  const insets = useSafeAreaInsets();

  return (
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
            (session.rest_started_at && timerRemaining > 0 ? 68 : 0),
        },
        session.status !== "in_progress" ? styles.fabDisabled : null,
      ]}
    >
      <Ionicons name="add" size={24} color={colors.textOnPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: spacing.lg,
    zIndex: 5,
    height: fabHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    elevation: 6,
    shadowColor: colors.fabShadowColor,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabDisabled: { opacity: 0.5 },
});

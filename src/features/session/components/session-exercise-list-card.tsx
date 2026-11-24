import { SessionExercise } from "@/db/queries";
import { colors, radius, spacing, typography } from "@/theme/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSessionExerciseSwipe } from "../hooks/use-session-exercise-swipe";

export function SessionExerciseListCard({
  exercise,
  onChange,
  onOpen,
  onDelete,
}: {
  exercise: SessionExercise;
  onChange: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const swipe = useSessionExerciseSwipe(onDelete);
  const completedSets = exercise.sets.filter((set) => set.completed).length;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${exercise.exercise_name}`}
        onPress={swipe.requestDelete}
        style={[styles.deleteAction, { width: swipe.actionWidth + 10 }]}
      >
        <Ionicons name="trash-outline" size={22} color={colors.textOnPrimary} />
      </Pressable>
      <Animated.View
        {...swipe.panHandlers}
        style={[styles.card, { transform: [{ translateX: swipe.offset }] }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${exercise.exercise_name}, ${exercise.muscle}`}
          onPress={onOpen}
          style={styles.cardContent}
        >
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={1}>
              {exercise.exercise_name}
            </Text>
            <View style={styles.meta}>
              <Text style={styles.muscle} numberOfLines={1}>
                {exercise.muscle}
              </Text>
              <Text style={styles.setCount}>
                {completedSets}/{exercise.sets.length} sets
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Change ${exercise.exercise_name}`}
            onPress={onChange}
            hitSlop={8}
            style={styles.changeButton}
          >
            <Ionicons
              name="swap-horizontal-outline"
              size={22}
              color={colors.primary}
            />
          </Pressable>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 82, position: "relative", justifyContent: "center" },
  deleteAction: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderStartStartRadius: radius.md,
    borderEndStartRadius: radius.md,
    borderTopEndRadius: 0,
    borderEndEndRadius: 0,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    minHeight: 82,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  copy: { flex: 1, minWidth: 0, gap: spacing.sm },
  title: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "800",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  muscle: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  setCount: { color: colors.textSecondary, fontSize: typography.caption },
  changeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});

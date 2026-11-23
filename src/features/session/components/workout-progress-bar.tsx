import { colors, radius, spacing } from "@/theme/colors";
import { StyleSheet, View } from "react-native";

export function WorkoutProgressBar({
  total,
  completed,
}: {
  total: number;
  completed: number;
}) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progress,
          {
            width: `${total ? (completed / total) * 100 : 0}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
});

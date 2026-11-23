import { colors, spacing, typography } from "@/theme/colors";
import { StyleSheet, Text, View } from "react-native";

export function LoadingWorkoutSession({
  message: loadingMessage,
}: {
  message: string;
}) {
  return (
    <View style={styles.center}>
      <Text style={styles.secondary}>{loadingMessage}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  secondary: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: 2,
  },
});

import { Button } from "@/components/ui";
import { colors, spacing, typography } from "@/theme/colors";
import { StyleSheet, Text, View } from "react-native";

export function NotFoundWorkoutSession({ goHome }: { goHome: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Session unavailable</Text>
      <Button title="Go home" onPress={() => goHome()} />
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
  title: {
    color: colors.textPrimary,
    fontSize: typography.heading,
    fontWeight: "800",
  },
});

import { Button } from "@/components/ui";
import { colors, spacing, typography } from "@/theme/colors";
import { StyleSheet, Text, View } from "react-native";

export function ErrorWorkoutSession({
  loadError,
  goHome,
  retry,
  validSessionId,
}: {
  loadError: string;
  validSessionId: boolean;
  goHome: () => void;
  retry: () => void;
}) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Session unavailable</Text>
      <Text style={styles.secondary}>{loadError}</Text>
      {validSessionId ? <Button title="Retry" onPress={() => retry()} /> : null}
      <Button title="Go home" variant="secondary" onPress={() => goHome()} />
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
  secondary: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: 2,
  },
});

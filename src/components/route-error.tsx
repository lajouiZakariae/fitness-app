import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ErrorBoundaryProps } from "expo-router";
import { Button } from "@/components/ui";
import { colors, spacing, typography } from "@/theme/colors";

export function RouteError({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error("A route render failed.", error);
  }, [error]);

  const retryRoute = async () => {
    try {
      await retry();
    } catch (retryError) {
      console.error("Could not retry the failed route.", retryError);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>
        This screen couldn’t be displayed. Try again.
      </Text>
      <Button
        title="Try again"
        onPress={() => {
          void retryRoute();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.heading,
    fontWeight: "800",
  },
  message: { color: colors.textSecondary, fontSize: typography.body },
});

import {
  DarkTheme,
  ThemeProvider,
  Stack,
  type ErrorBoundaryProps,
} from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { migrateDatabase } from "@/db/migrations";
import { colors } from "@/theme/colors";
import { RouteError } from "@/components/route-error";

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <RouteError {...props} />;
}

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    primary: colors.primary,
    text: colors.textPrimary,
  },
};

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="fitness.db" onInit={migrateDatabase}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="choose-workout" />
          <Stack.Screen name="session/[id]" />
          <Stack.Screen name="exercise/new" />
          <Stack.Screen name="workout/new" />
          <Stack.Screen name="workout/[id]" />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}

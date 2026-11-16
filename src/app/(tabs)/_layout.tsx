import { Slot, router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing } from "@/theme/colors";

export default function TabsLayout() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.frame}>
      <View style={[styles.slot, { paddingBottom: 84 + insets.bottom }]}>
        <Slot />
      </View>
      <View
        style={[
          styles.bar,
          {
            height: 78 + insets.bottom,
            paddingBottom: spacing.sm + insets.bottom,
          },
        ]}
      >
        <Tab
          label="Home"
          symbol="⌂"
          active={pathname.includes("/home")}
          onPress={() => router.push("/(tabs)/home")}
        />
        <Tab
          label=""
          symbol="+"
          center
          active={pathname.includes("/add")}
          onPress={() => router.push("/(tabs)/add")}
        />
        <Tab
          label="Library"
          symbol="▤"
          active={pathname.includes("/library")}
          onPress={() => router.push("/(tabs)/library")}
        />
      </View>
    </View>
  );
}
function Tab({
  label,
  symbol,
  active,
  center,
  onPress,
}: {
  label: string;
  symbol: string;
  active: boolean;
  center?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label || "Add"}
      onPress={onPress}
      style={[styles.tab, center ? styles.centerTab : null]}
    >
      <Text
        style={[
          styles.symbol,
          center ? styles.plus : null,
          active && !center ? styles.active : null,
        ]}
      >
        {symbol}
      </Text>
      {label ? (
        <Text style={[styles.label, active ? styles.active : null]}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: colors.background },
  slot: { flex: 1, paddingBottom: 84 },
  bar: {
    height: 78,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: {
    minWidth: 64,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  centerTab: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    marginTop: -28,
    borderWidth: 5,
    borderColor: colors.background,
  },
  symbol: {
    color: colors.textSecondary,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "700",
  },
  plus: { fontSize: 28, color: colors.textOnPrimary },
  label: { color: colors.textSecondary, fontSize: 11, fontWeight: "700" },
  active: { color: colors.primary },
});

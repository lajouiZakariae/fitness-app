import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing, typography } from "@/theme/colors";

export function Screen({
  children,
  scroll = false,
  style,
}: ViewProps & { scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, style]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
export function Heading({
  children,
  subtitle,
}: {
  children: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.heading}>
      <Text style={styles.title}>{children}</Text>
      {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
    </View>
  );
}
export function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}
export function Card({ children, style, ...props }: ViewProps) {
  return (
    <View {...props} style={[styles.card, style]}>
      {children}
    </View>
  );
}
export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "quiet";
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary"
          ? styles.primary
          : variant === "danger"
            ? styles.danger
            : variant === "quiet"
              ? styles.quiet
              : styles.secondary,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={
          variant === "primary"
            ? styles.buttonText
            : variant === "danger"
              ? styles.buttonText
              : styles.secondaryText
        }
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  );
}
export function PickerField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Label>{label}</Label>
      <Pressable style={styles.input} onPress={() => setOpen(true)}>
        <Text style={styles.inputText}>{value || "Choose one"}</Text>
        <Text style={styles.muted}>⌄</Text>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalShade}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView>
              {options.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  style={styles.option}
                >
                  <Text style={styles.inputText}>{option}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => setOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
export function InlineError({ children }: { children?: string }) {
  return children ? <Text style={styles.error}>{children}</Text> : null;
}
export const sharedStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  spread: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  section: { gap: spacing.md },
  muted: { color: colors.textSecondary, fontSize: typography.caption },
  link: { color: colors.primary, fontSize: typography.body, fontWeight: "700" },
  divider: { height: 1, backgroundColor: colors.border },
  smallButton: {
    minWidth: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
});
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.lg },
  heading: { gap: spacing.xs, marginBottom: spacing.sm },
  title: {
    color: colors.textPrimary,
    fontSize: typography.title,
    fontWeight: "800",
  },
  muted: { color: colors.textSecondary, fontSize: typography.body },
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: "700",
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: { backgroundColor: colors.danger },
  quiet: { backgroundColor: "transparent" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
  buttonText: {
    color: colors.textOnPrimary,
    fontSize: typography.body,
    fontWeight: "800",
  },
  secondaryText: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "700",
  },
  fieldWrap: { gap: spacing.xs },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    fontSize: typography.body,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputText: { color: colors.textPrimary, fontSize: typography.body },
  error: { color: colors.danger, fontSize: typography.caption },
  modalShade: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    maxHeight: "75%",
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: typography.heading,
  },
  option: {
    minHeight: 52,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});

import { IconButton } from "@/components/icon-button";
import type { Session } from "@/db/queries";
import { colors, radius, spacing, typography } from "@/theme/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SessionExercise = Session["exercises"][number];

type MeasurableView = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

export function SessionExerciseDropdownActions({
  exercise,
  sessionId,
  disabled,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
}: {
  exercise: SessionExercise;
  sessionId: number;
  disabled: boolean;
  onAddSet: (exercise: SessionExercise) => void;
  onRemoveSet: (exercise: SessionExercise) => void;
  onRemoveExercise: (exercise: SessionExercise) => void;
}) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const trigger = useRef<MeasurableView | null>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number }>({
    top: 0,
    right: spacing.lg,
  });

  const open = () => {
    trigger.current?.measureInWindow((x, y, width) => {
      const menuHeight = 4 * 48 + spacing.md;
      const menuWidth = Math.min(240, window.width - spacing.lg * 2);
      const right = Math.max(spacing.lg, window.width - (x + width));
      const top = Math.min(
        Math.max(insets.top + spacing.sm, y),
        window.height - insets.bottom - spacing.sm - menuHeight,
      );
      setPosition({
        top,
        right: Math.min(right, window.width - menuWidth - spacing.lg),
      });
      setVisible(true);
    });
  };

  const select = (action: () => void) => {
    setVisible(false);
    action();
  };

  return (
    <>
      <View
        ref={(view) => {
          trigger.current = view as MeasurableView | null;
        }}
        collapsable={false}
      >
        <IconButton
          icon="ellipsis-vertical"
          label={`Actions for ${exercise.exercise_name}`}
          onPress={open}
        />
      </View>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.shade} onPress={() => setVisible(false)}>
          <View style={[styles.menu, { top: position.top, right: position.right }]}>
            <MenuAction
              icon="swap-horizontal"
              title="Change exercise"
              disabled={disabled}
              onPress={() =>
                select(() =>
                  router.push({
                    pathname: "/session/add-exercise",
                    params: {
                      sessionId: String(sessionId),
                      replaceId: String(exercise.id),
                    },
                  }),
                )
              }
            />
            <MenuAction
              icon="add"
              title="Add a set"
              disabled={disabled}
              onPress={() => select(() => onAddSet(exercise))}
            />
            <MenuAction
              icon="remove"
              title="Remove a set"
              disabled={disabled || exercise.sets.length === 0}
              onPress={() => select(() => onRemoveSet(exercise))}
            />
            <MenuAction
              icon="trash-outline"
              title="Remove exercise"
              danger
              disabled={disabled}
              onPress={() => select(() => onRemoveExercise(exercise))}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function MenuAction({
  icon,
  title,
  onPress,
  disabled = false,
  danger = false,
}: {
  icon: "swap-horizontal" | "add" | "remove" | "trash-outline";
  title: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        disabled ? styles.disabled : null,
        pressed && !disabled ? { opacity: 0.7 } : null,
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={danger ? colors.danger : colors.primary}
      />
      <Text style={[styles.actionText, danger ? styles.danger : null]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shade: { flex: 1 },
  menu: {
    position: "absolute",
    width: 240,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  action: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  actionText: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "600",
  },
  danger: { color: colors.danger },
  disabled: { opacity: 0.45 },
});

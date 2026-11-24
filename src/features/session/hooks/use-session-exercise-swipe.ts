import { useCallback, useMemo, useState } from "react";
import { Animated, PanResponder } from "react-native";

const DELETE_ACTION_WIDTH = 68;
const COMPLETE_THRESHOLD = DELETE_ACTION_WIDTH * 0.9;

export function useSessionExerciseSwipe(onDelete: () => void) {
  const [offset] = useState(() => new Animated.Value(0));
  const animateTo = useCallback(() => {
    Animated.spring(offset, {
      toValue: 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 0,
    }).start();
  }, [offset]);

  const requestDelete = useCallback(() => {
    onDelete();
  }, [onDelete]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          gesture.dx > 6 && gesture.dx > Math.abs(gesture.dy),
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dx > 6 && gesture.dx > Math.abs(gesture.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, gesture) => {
          offset.setValue(
            Math.max(0, Math.min(DELETE_ACTION_WIDTH, gesture.dx)),
          );
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx >= COMPLETE_THRESHOLD) {
            animateTo();
            requestDelete();
          } else animateTo();
        },
        onPanResponderTerminate: () => animateTo(),
      }),
    [animateTo, offset, requestDelete],
  );

  return {
    actionWidth: DELETE_ACTION_WIDTH,
    offset,
    panHandlers: panResponder.panHandlers,
    requestDelete,
  };
}

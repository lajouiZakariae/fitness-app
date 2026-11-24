import { useLocalSearchParams } from "expo-router";

export function useWorkoutSessionParamId(): number {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();

  const sessionId = Number(rawId);

  return sessionId;
}

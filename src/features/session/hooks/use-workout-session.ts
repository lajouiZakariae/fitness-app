import {
  addSessionSet,
  clearRestTimer,
  completeSession,
  deleteSession as deleteSessionQuery,
  getSession,
  removeSessionExercise,
  removeSessionSet,
  setRestTimer,
  updateSet,
  updateSetReps,
  type Session,
} from "@/db/queries";
import { useSessionStore } from "@/store/session-store";
import { useRestTimer } from "@/features/session/hooks/use-rest-timer";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

type Phase = "loading" | "error" | "success";
type SessionExercise = Session["exercises"][number];

export function useWorkoutSession(sessionId: number) {
  const db = useSQLiteContext();
  const validSessionId = Number.isInteger(sessionId) && sessionId > 0;
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [weights, setWeights] = useState<Record<number, string>>({});
  const [reps, setReps] = useState<Record<number, string>>({});
  const [removeExercisePending, setRemoveExercisePending] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Loading session...");
  const setActiveSessionId = useSessionStore(
    (state) => state.setActiveSessionId,
  );

  const refresh = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      const next = await getSession(db, sessionId);
      if (isCancelled()) return;
      setSession(next);
      if (next) {
        setReps((current) => {
          const updated = { ...current };
          for (const exercise of next.exercises)
            for (const set of exercise.sets)
              if (updated[set.id] === undefined)
                updated[set.id] = String(set.target_reps);
          return updated;
        });
        setWeights((current) => {
          const updated = { ...current };
          for (const exercise of next.exercises)
            for (const set of exercise.sets)
              if (updated[set.id] === undefined)
                updated[set.id] = set.weight == null ? "" : String(set.weight);
          return updated;
        });
        setActiveSessionId(next.status === "in_progress" ? next.id : null);
      } else setActiveSessionId(null);
      return next;
    },
    [db, sessionId, setActiveSessionId],
  );

  const restTimer = useRestTimer({ sessionId, session, refresh });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setPhase("loading");
      setLoadingMessage(
        retryKey ? "Retrying session load..." : "Loading session...",
      );
      setLoadError("");
      if (!validSessionId) {
        setLoadError("Invalid session ID.");
        setPhase("error");
        return () => {
          cancelled = true;
        };
      }
      void refresh(() => cancelled)
        .then((next) => {
          if (cancelled) return;
          if (next) setPhase("success");
          else {
            setLoadError("Session not found.");
            setPhase("error");
          }
        })
        .catch((error) => {
          console.error("Could not load the session.", error);
          if (!cancelled) {
            setLoadError("Could not load this workout session.");
            setPhase("error");
          }
        });
      return () => {
        cancelled = true;
      };
    }, [refresh, retryKey, validSessionId]),
  );

  const total = useMemo(
    () =>
      session?.exercises.reduce(
        (sum, exercise) => sum + exercise.sets.length,
        0,
      ) ?? 0,
    [session],
  );
  const completed = useMemo(
    () =>
      session?.exercises.reduce(
        (sum, exercise) =>
          sum + exercise.sets.filter((set) => set.completed).length,
        0,
      ) ?? 0,
    [session],
  );
  const toggleSet = useCallback(
    async (setId: number, currentCompleted: boolean, rest: number) => {
      const raw = weights[setId]?.trim() ?? "";
      const value = raw ? Number(raw.replace(",", ".")) : null;
      if (value !== null && (!Number.isFinite(value) || value < 0)) {
        Alert.alert("Check the weight", "Enter a valid weight in kilograms.");
        return;
      }
      setActionError("");
      try {
        const nextCompleted = !currentCompleted;
        await updateSet(db, setId, nextCompleted, value);
        if (nextCompleted && rest > 0) await setRestTimer(db, sessionId, rest);
        else if (!nextCompleted && session?.rest_started_at)
          await clearRestTimer(db, sessionId);
        await refresh();
      } catch (error) {
        console.error("Could not update the set.", error);
        setActionError("Could not update this set. Please try again.");
      }
    },
    [db, refresh, session, sessionId, weights],
  );
  const saveWeight = useCallback(
    async (setId: number, completedValue: boolean) => {
      const raw = weights[setId]?.trim() ?? "";
      const value = raw ? Number(raw.replace(",", ".")) : null;
      if (value !== null && (!Number.isFinite(value) || value < 0)) {
        setActionError("Enter a valid weight in kilograms.");
        return;
      }
      setActionError("");
      try {
        await updateSet(db, setId, completedValue, value);
      } catch (error) {
        console.error("Could not save the set weight.", error);
        setActionError("Could not save the weight. Please try again.");
      }
    },
    [db, weights],
  );
  const saveReps = useCallback(
    async (setId: number, value: string, currentReps: number) => {
      const nextReps = Number(value);
      if (
        Number.isInteger(nextReps) &&
        nextReps > 0 &&
        nextReps !== currentReps
      ) {
        try {
          await updateSetReps(db, setId, nextReps);
          await refresh();
        } catch {
          setActionError("Could not save reps.");
        }
      } else if (!Number.isInteger(nextReps) || nextReps < 1)
        setReps((current) => ({ ...current, [setId]: String(currentReps) }));
    },
    [db, refresh],
  );
  const addSet = useCallback(
    async (exercise: SessionExercise, weight: number | null) => {
      setActionError("");
      try {
        await addSessionSet(db, exercise, weight);
        await refresh();
      } catch (error) {
        console.error("Could not add a session set.", error);
        setActionError("Could not add a set. Please try again.");
      }
    },
    [db, refresh],
  );
  const removeSet = useCallback(
    async (exercise: SessionExercise) => {
      setActionError("");
      try {
        await removeSessionSet(db, exercise);
        await refresh();
      } catch (error) {
        console.error("Could not remove a session set.", error);
        setActionError("Could not remove a set. Please try again.");
      }
    },
    [db, refresh],
  );
  const removeExercise = useCallback(
    async (exercise: SessionExercise | null) => {
      if (!session || !exercise || removeExercisePending) return;
      setRemoveExercisePending(true);
      setActionError("");
      try {
        await removeSessionExercise(db, session, exercise.id);
        await refresh();
        return true;
      } catch (error) {
        console.error("Could not remove the session exercise.", error);
        setActionError("Could not remove this exercise. Please try again.");
        return false;
      } finally {
        setRemoveExercisePending(false);
      }
    },
    [db, refresh, removeExercisePending, session],
  );
  const save = useCallback(async () => {
    setActionError("");
    try {
      await completeSession(db, sessionId);
      setActiveSessionId(null);
      router.replace("/(tabs)/home");
    } catch (error) {
      console.error("Could not finish the workout.", error);
      setActionError(
        "Could not finish the workout. Your session is still saved.",
      );
    }
  }, [db, sessionId, setActiveSessionId]);
  const finish = useCallback(() => {
    if (completed < total)
      Alert.alert(
        "Finish workout?",
        `${total - completed} set${total - completed === 1 ? "" : "s"} are unfinished. They will be saved as incomplete.`,
        [
          { text: "Keep training", style: "cancel" },
          {
            text: "Finish workout",
            onPress: () => {
              void save();
            },
          },
        ],
      );
    else void save();
  }, [completed, save, total]);
  const deleteSession = useCallback(
    () =>
      Alert.alert(
        "Delete workout session?",
        "This will permanently delete this session and all of its recorded sets.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete session",
            style: "destructive",
            onPress: () => {
              void (async () => {
                setActionError("");
                try {
                  await deleteSessionQuery(db, sessionId);
                  setActiveSessionId(null);
                  router.replace("/(tabs)/home");
                } catch (error) {
                  console.error("Could not delete the workout session.", error);
                  setActionError(
                    "Could not delete this workout session. Please try again.",
                  );
                }
              })();
            },
          },
        ],
      ),
    [db, sessionId, setActiveSessionId],
  );
  const skipRest = useCallback(async () => {
    setActionError("");
    try {
      await clearRestTimer(db, sessionId);
      await refresh();
    } catch (error) {
      console.error("Could not skip the rest timer.", error);
      setActionError("Could not skip the rest timer. Please try again.");
    }
  }, [db, refresh, sessionId]);
  const goHome = useCallback(() => router.replace("/(tabs)/home"), []);

  const actions = {
    actionError,
    timerError: restTimer.timerError,
    timerPhase: restTimer.timerPhase,
    loadingMessage,
    loadError,
    validSessionId,
    total,
    completed,
    timerRemaining: restTimer.timerRemaining,
    weights,
    reps,
    removeExercisePending,
    setWeight: (setId: number, value: string) =>
      setWeights((current) => ({ ...current, [setId]: value })),
    setReps: (setId: number, value: string) =>
      setReps((current) => ({ ...current, [setId]: value })),
    retry: () => setRetryKey((key) => key + 1),
    refresh,
    clearExpiredTimer: restTimer.clearExpiredTimer,
    toggleSet,
    saveWeight,
    saveReps,
    addSet,
    removeSet,
    removeExercise,
    finish,
    deleteSession,
    skipRest,
    goHome,
  };
  return { session, phase, actions };
}

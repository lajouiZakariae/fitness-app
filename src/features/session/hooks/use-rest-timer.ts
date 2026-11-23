import { clearRestTimer, type Session } from "@/db/queries";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";

type RefreshSession = (isCancelled?: () => boolean) => Promise<Session | null | undefined>;

type UseRestTimerOptions = {
  sessionId: number;
  session: Session | null;
  refresh: RefreshSession;
};

export function useRestTimer({ sessionId, session, refresh }: UseRestTimerOptions) {
  const db = useSQLiteContext();
  const [now, setNow] = useState(0);
  const [timerError, setTimerError] = useState("");
  const [timerPhase, setTimerPhase] = useState<"loading" | "error" | "success">("success");

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  const timerRemaining = session?.rest_started_at
    ? Math.min(
        session.rest_duration_seconds,
        Math.max(
          0,
          session.rest_duration_seconds -
            Math.floor((now - Date.parse(session.rest_started_at)) / 1000),
        ),
      )
    : 0;

  const clearExpiredTimer = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      if (isCancelled()) return;
      setTimerPhase("loading");
      setTimerError("");
      try {
        await clearRestTimer(db, sessionId);
        await refresh(isCancelled);
        if (!isCancelled()) setTimerPhase("success");
      } catch (error) {
        console.error("Could not clear the expired rest timer.", error);
        if (!isCancelled()) {
          setTimerError("Could not update the rest timer.");
          setTimerPhase("error");
        }
      }
    },
    [db, refresh, sessionId],
  );

  useEffect(() => {
    if (!session?.rest_started_at || timerRemaining !== 0) return;
    let cancelled = false;
    void Promise.resolve().then(() => clearExpiredTimer(() => cancelled));
    return () => {
      cancelled = true;
    };
  }, [clearExpiredTimer, session, timerRemaining]);

  return { timerError, timerPhase, timerRemaining, clearExpiredTimer };
}

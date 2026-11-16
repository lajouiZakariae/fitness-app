import { create } from "zustand";

type SessionUiState = {
  activeSessionId: number | null;
  timerRefresh: number;
  setActiveSessionId: (id: number | null) => void;
  refreshTimer: () => void;
};
export const useSessionStore = create<SessionUiState>((set) => ({
  activeSessionId: null,
  timerRefresh: Date.now(),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  refreshTimer: () => set({ timerRefresh: Date.now() }),
}));

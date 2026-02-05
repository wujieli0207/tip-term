import { create } from "zustand";

interface TerminalSearchState {
  // Per-session search state
  activeSessionId: string | null;
  isOpen: boolean;
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
  matchCount: number;
  currentMatch: number;
}

interface TerminalSearchActions {
  open: (sessionId: string) => void;
  close: () => void;
  setQuery: (query: string) => void;
  setCaseSensitive: (value: boolean) => void;
  setWholeWord: (value: boolean) => void;
  setRegex: (value: boolean) => void;
  setMatchInfo: (current: number, total: number) => void;
  // Toggle methods for stable callbacks (rerender-functional-setstate)
  toggleCaseSensitive: () => void;
  toggleWholeWord: () => void;
  toggleRegex: () => void;
}

export const useTerminalSearchStore = create<TerminalSearchState & TerminalSearchActions>((set) => ({
  activeSessionId: null,
  isOpen: false,
  query: "",
  caseSensitive: false,
  wholeWord: false,
  regex: false,
  matchCount: 0,
  currentMatch: 0,

  open: (sessionId: string) => set({ isOpen: true, activeSessionId: sessionId }),
  close: () => set({ isOpen: false, query: "", matchCount: 0, currentMatch: 0 }),
  setQuery: (query: string) => set({ query }),
  setCaseSensitive: (caseSensitive: boolean) => set({ caseSensitive }),
  setWholeWord: (wholeWord: boolean) => set({ wholeWord }),
  setRegex: (regex: boolean) => set({ regex }),
  setMatchInfo: (currentMatch: number, matchCount: number) => set({ currentMatch, matchCount }),
  // Toggle methods using functional setState for stable callbacks
  toggleCaseSensitive: () => set((state) => ({ caseSensitive: !state.caseSensitive })),
  toggleWholeWord: () => set((state) => ({ wholeWord: !state.wholeWord })),
  toggleRegex: () => set((state) => ({ regex: !state.regex })),
}));

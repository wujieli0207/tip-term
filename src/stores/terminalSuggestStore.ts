import { create } from "zustand";

export interface TerminalSuggestEntry {
  input: string;
  suggestions: string[];
  popupOpen: boolean;
  selectedIndex: number;
}

interface TerminalSuggestStore {
  entries: Map<string, TerminalSuggestEntry>;
  ensureSession: (sessionId: string) => void;
  resetSession: (sessionId: string) => void;
  setInput: (sessionId: string, input: string) => void;
  setSuggestions: (sessionId: string, suggestions: string[]) => void;
  openPopup: (sessionId: string) => void;
  closePopup: (sessionId: string) => void;
  moveSelection: (sessionId: string, direction: "up" | "down") => void;
  setSelectedIndex: (sessionId: string, index: number) => void;
}

const createEntry = (): TerminalSuggestEntry => ({
  input: "",
  suggestions: [],
  popupOpen: false,
  selectedIndex: 0,
});

export const useTerminalSuggestStore = create<TerminalSuggestStore>((set, get) => ({
  entries: new Map(),
  ensureSession: (sessionId) => {
    const state = get();
    if (state.entries.has(sessionId)) return;
    const newEntries = new Map(state.entries);
    newEntries.set(sessionId, createEntry());
    set({ entries: newEntries });
  },
  resetSession: (sessionId) => {
    const state = get();
    if (!state.entries.has(sessionId)) return;
    const newEntries = new Map(state.entries);
    newEntries.delete(sessionId);
    set({ entries: newEntries });
  },
  setInput: (sessionId, input) => {
    const state = get();
    const entry = state.entries.get(sessionId) ?? createEntry();
    const newEntries = new Map(state.entries);
    newEntries.set(sessionId, { ...entry, input });
    set({ entries: newEntries });
  },
  setSuggestions: (sessionId, suggestions) => {
    const state = get();
    const entry = state.entries.get(sessionId) ?? createEntry();
    const nextIndex = Math.min(entry.selectedIndex, Math.max(0, suggestions.length - 1));
    const newEntries = new Map(state.entries);
    newEntries.set(sessionId, {
      ...entry,
      suggestions,
      selectedIndex: suggestions.length === 0 ? 0 : nextIndex,
      popupOpen: suggestions.length === 0 ? false : entry.popupOpen,
    });
    set({ entries: newEntries });
  },
  openPopup: (sessionId) => {
    const state = get();
    const entry = state.entries.get(sessionId) ?? createEntry();
    const newEntries = new Map(state.entries);
    newEntries.set(sessionId, {
      ...entry,
      popupOpen: true,
      selectedIndex: entry.selectedIndex < 0 ? 0 : entry.selectedIndex,
    });
    set({ entries: newEntries });
  },
  closePopup: (sessionId) => {
    const state = get();
    const entry = state.entries.get(sessionId);
    if (!entry) return;
    const newEntries = new Map(state.entries);
    newEntries.set(sessionId, {
      ...entry,
      popupOpen: false,
      selectedIndex: 0,
    });
    set({ entries: newEntries });
  },
  moveSelection: (sessionId, direction) => {
    const state = get();
    const entry = state.entries.get(sessionId);
    if (!entry || entry.suggestions.length === 0) return;
    const total = entry.suggestions.length;
    const delta = direction === "up" ? -1 : 1;
    const nextIndex = (entry.selectedIndex + delta + total) % total;
    const newEntries = new Map(state.entries);
    newEntries.set(sessionId, { ...entry, selectedIndex: nextIndex });
    set({ entries: newEntries });
  },
  setSelectedIndex: (sessionId, index) => {
    const state = get();
    const entry = state.entries.get(sessionId);
    if (!entry) return;
    const nextIndex = Math.min(Math.max(0, index), Math.max(0, entry.suggestions.length - 1));
    const newEntries = new Map(state.entries);
    newEntries.set(sessionId, { ...entry, selectedIndex: nextIndex });
    set({ entries: newEntries });
  },
}));

import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface SessionInfo {
  id: string;
  name: string;
  workspaceId: string | null;
  createdAt: number;
  order: number;
  processName?: string;
  cwd?: string;
  terminalTitle?: string;  // Title set by terminal program via OSC sequences
  customName?: string;     // User-set custom name via double-click rename
  notifyWhenDone?: boolean;    // Notify when command completes
  notifyOnActivity?: boolean;  // Notify on new terminal output
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  isExpanded: boolean;
  order: number;
}

interface SessionStore {
  sessions: Map<string, SessionInfo>;
  workspaces: WorkspaceInfo[];
  activeSessionId: string | null;
  sidebarCollapsed: boolean;
  sidebarWidth: number;

  // Actions
  createSession: (workspaceId?: string) => Promise<string>;
  closeSession: (id: string) => Promise<void>;
  setActiveSession: (id: string) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  renameSession: (id: string, name: string) => void;
  updateSessionProcessInfo: (id: string, processName: string, cwd: string) => void;
  updateSessionTerminalTitle: (id: string, title: string) => void;
  setSessionCustomName: (id: string, customName: string | null) => void;
  setNotifyWhenDone: (id: string, enabled: boolean) => void;
  setNotifyOnActivity: (id: string, enabled: boolean) => void;
  getSessionsList: () => SessionInfo[];
  reorderSessions: (activeId: string, overId: string) => void;
}

let sessionCounter = 0;

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: new Map(),
  workspaces: [],
  activeSessionId: null,
  sidebarCollapsed: false,
  sidebarWidth: 220,

  createSession: async (workspaceId?: string) => {
    try {
      const id = await invoke<string>("create_session", { shell: "/bin/zsh" });
      sessionCounter++;
      const session: SessionInfo = {
        id,
        name: `Session ${sessionCounter}`,
        workspaceId: workspaceId ?? null,
        createdAt: Date.now(),
        order: sessionCounter,
      };

      set((state) => {
        const newSessions = new Map(state.sessions);
        newSessions.set(id, session);
        return {
          sessions: newSessions,
          activeSessionId: id,
        };
      });

      return id;
    } catch (error) {
      console.error("Failed to create session:", error);
      throw error;
    }
  },

  closeSession: async (id: string) => {
    try {
      await invoke("close_session", { id });

      set((state) => {
        const newSessions = new Map(state.sessions);
        newSessions.delete(id);

        // If closing active session, switch to another
        let newActiveId = state.activeSessionId;
        if (state.activeSessionId === id) {
          const remaining = Array.from(newSessions.keys());
          newActiveId = remaining.length > 0 ? remaining[remaining.length - 1] : null;
        }

        return {
          sessions: newSessions,
          activeSessionId: newActiveId,
        };
      });
    } catch (error) {
      console.error("Failed to close session:", error);
      throw error;
    }
  },

  setActiveSession: (id: string) => {
    const state = get();
    if (state.sessions.has(id)) {
      set({ activeSessionId: id });
    }
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setSidebarWidth: (width: number) => {
    set({ sidebarWidth: Math.max(160, Math.min(400, width)) });
  },

  renameSession: (id: string, name: string) => {
    set((state) => {
      const session = state.sessions.get(id);
      if (!session) return state;

      const newSessions = new Map(state.sessions);
      newSessions.set(id, { ...session, name });
      return { sessions: newSessions };
    });
  },

  updateSessionProcessInfo: (id: string, processName: string, cwd: string) => {
    set((state) => {
      const session = state.sessions.get(id);
      if (!session) return state;

      const newSessions = new Map(state.sessions);
      newSessions.set(id, { ...session, processName, cwd });
      return { sessions: newSessions };
    });
  },

  updateSessionTerminalTitle: (id: string, title: string) => {
    set((state) => {
      const session = state.sessions.get(id);
      if (!session) return state;

      const newSessions = new Map(state.sessions);
      newSessions.set(id, { ...session, terminalTitle: title || undefined });
      return { sessions: newSessions };
    });
  },

  setSessionCustomName: (id: string, customName: string | null) => {
    set((state) => {
      const session = state.sessions.get(id);
      if (!session) return state;

      const newSessions = new Map(state.sessions);
      newSessions.set(id, {
        ...session,
        customName: customName || undefined
      });
      return { sessions: newSessions };
    });
  },

  setNotifyWhenDone: (id: string, enabled: boolean) => {
    set((state) => {
      const session = state.sessions.get(id);
      if (!session) return state;

      const newSessions = new Map(state.sessions);
      newSessions.set(id, {
        ...session,
        notifyWhenDone: enabled || undefined
      });
      return { sessions: newSessions };
    });
  },

  setNotifyOnActivity: (id: string, enabled: boolean) => {
    set((state) => {
      const session = state.sessions.get(id);
      if (!session) return state;

      const newSessions = new Map(state.sessions);
      newSessions.set(id, {
        ...session,
        notifyOnActivity: enabled || undefined
      });
      return { sessions: newSessions };
    });
  },

  getSessionsList: () => {
    const state = get();
    return Array.from(state.sessions.values()).sort((a, b) => a.order - b.order);
  },

  reorderSessions: (activeId: string, overId: string) => {
    set((state) => {
      const sessionsList = Array.from(state.sessions.values()).sort((a, b) => a.order - b.order);
      const oldIndex = sessionsList.findIndex((s) => s.id === activeId);
      const newIndex = sessionsList.findIndex((s) => s.id === overId);

      if (oldIndex === -1 || newIndex === -1) return state;

      // Reorder the array
      const [removed] = sessionsList.splice(oldIndex, 1);
      sessionsList.splice(newIndex, 0, removed);

      // Update order values
      const newSessions = new Map(state.sessions);
      sessionsList.forEach((session, index) => {
        newSessions.set(session.id, { ...session, order: index + 1 });
      });

      return { sessions: newSessions };
    });
  },
}));

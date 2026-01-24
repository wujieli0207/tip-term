import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

// Group color types and constants
export type GroupColor = 'gray' | 'blue' | 'purple' | 'pink' | 'red' | 'orange' | 'yellow' | 'green' | 'cyan';

export const GROUP_COLORS: Record<GroupColor, { bg: string; border: string; text: string }> = {
  gray:   { bg: '#3a3a3a', border: '#5a5a5a', text: '#e0e0e0' },
  blue:   { bg: '#1e3a5f', border: '#2d5a8a', text: '#7db3ff' },
  purple: { bg: '#3d2a5f', border: '#5a3d8a', text: '#b794f4' },
  pink:   { bg: '#5f2a4a', border: '#8a3d6a', text: '#f687b3' },
  red:    { bg: '#5f2a2a', border: '#8a3d3d', text: '#fc8181' },
  orange: { bg: '#5f3d1e', border: '#8a5a2d', text: '#f6ad55' },
  yellow: { bg: '#5f5a1e', border: '#8a7a2d', text: '#faf089' },
  green:  { bg: '#1e5f3a', border: '#2d8a5a', text: '#68d391' },
  cyan:   { bg: '#1e4a5f', border: '#2d6a8a', text: '#4fd1c5' },
};

export interface GroupInfo {
  id: string;
  name: string;
  color: GroupColor;
  isCollapsed: boolean;
  order: number;
  createdAt: number;
}

export interface SessionInfo {
  id: string;
  name: string;
  type: "terminal" | "settings";
  workspaceId: string | null;
  groupId: string | null;  // Group membership (null = ungrouped)
  createdAt: number;
  order: number;
  processName?: string;
  cwd?: string;
  terminalTitle?: string;  // Title set by terminal program via OSC sequences
  customName?: string;     // User-set custom name via double-click rename
  notifyWhenDone?: boolean;    // Notify when command completes
  notifyOnActivity?: boolean;  // Notify on new terminal output
}

// Sidebar item types for unified rendering
export type SidebarItem =
  | { type: 'session'; session: SessionInfo }
  | { type: 'group'; group: GroupInfo; sessions: SessionInfo[] };

export interface WorkspaceInfo {
  id: string;
  name: string;
  isExpanded: boolean;
  order: number;
}

const SETTINGS_SESSION_ID = "__settings__";

interface SessionStore {
  sessions: Map<string, SessionInfo>;
  groups: Map<string, GroupInfo>;
  workspaces: WorkspaceInfo[];
  activeSessionId: string | null;
  sidebarCollapsed: boolean;
  sidebarWidth: number;

  // Session Actions
  createSession: (workspaceId?: string, groupId?: string) => Promise<string>;
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

  // Group Actions
  createGroup: (sessionIds: string[], name?: string, color?: GroupColor) => string;
  deleteGroup: (groupId: string, deleteSessionsToo?: boolean) => Promise<void>;
  dissolveGroup: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  setGroupColor: (groupId: string, color: GroupColor) => void;
  toggleGroupCollapsed: (groupId: string) => void;
  reorderGroups: (activeId: string, overId: string) => void;

  // Session-Group Actions
  addSessionToGroup: (sessionId: string, groupId: string) => void;
  removeSessionFromGroup: (sessionId: string) => void;
  createSessionInGroup: (groupId: string) => Promise<string>;
  closeAllInGroup: (groupId: string) => Promise<void>;

  // Sidebar Helpers
  getSidebarItems: () => SidebarItem[];
  getGroupSessions: (groupId: string) => SessionInfo[];

  // Settings-related actions
  openSettings: () => void;
  isSettingsSession: (id: string) => boolean;
  getTerminalSessions: () => SessionInfo[];
}

let sessionCounter = 0;
let groupCounter = 0;

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: new Map(),
  groups: new Map(),
  workspaces: [],
  activeSessionId: null,
  sidebarCollapsed: false,
  sidebarWidth: 220,

  createSession: async (workspaceId?: string, groupId?: string) => {
    try {
      const id = await invoke<string>("create_session", { shell: "/bin/zsh" });
      sessionCounter++;
      const session: SessionInfo = {
        id,
        name: `Session ${sessionCounter}`,
        type: "terminal",
        workspaceId: workspaceId ?? null,
        groupId: groupId ?? null,
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
        const closingSession = state.sessions.get(id);
        const newSessions = new Map(state.sessions);
        newSessions.delete(id);

        // Check if we need to dissolve a group (last session leaving)
        const newGroups = new Map(state.groups);
        if (closingSession?.groupId) {
          const remainingInGroup = Array.from(newSessions.values())
            .filter(s => s.groupId === closingSession.groupId);
          if (remainingInGroup.length === 0) {
            newGroups.delete(closingSession.groupId);
          }
        }

        // If closing active session, switch to another
        let newActiveId = state.activeSessionId;
        if (state.activeSessionId === id) {
          const remaining = Array.from(newSessions.keys());
          newActiveId = remaining.length > 0 ? remaining[remaining.length - 1] : null;
        }

        return {
          sessions: newSessions,
          groups: newGroups,
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

  // Settings-related actions
  openSettings: () => {
    const state = get();
    // If settings session already exists, just activate it
    if (state.sessions.has(SETTINGS_SESSION_ID)) {
      set({ activeSessionId: SETTINGS_SESSION_ID });
      return;
    }

    // Create settings pseudo-session
    const settingsSession: SessionInfo = {
      id: SETTINGS_SESSION_ID,
      name: "Settings",
      type: "settings",
      workspaceId: null,
      groupId: null, // Settings session is never grouped
      createdAt: Date.now(),
      order: -1, // Settings always at special position
    };

    set((state) => {
      const newSessions = new Map(state.sessions);
      newSessions.set(SETTINGS_SESSION_ID, settingsSession);
      return {
        sessions: newSessions,
        activeSessionId: SETTINGS_SESSION_ID,
      };
    });
  },

  isSettingsSession: (id: string) => {
    return id === SETTINGS_SESSION_ID;
  },

  getTerminalSessions: () => {
    const state = get();
    return Array.from(state.sessions.values())
      .filter((s) => s.type === "terminal")
      .sort((a, b) => a.order - b.order);
  },

  // Group Actions
  createGroup: (sessionIds: string[], name?: string, color?: GroupColor) => {
    groupCounter++;
    const id = `group-${groupCounter}-${Date.now()}`;

    // Calculate order based on first session's position
    const state = get();
    const sessions = Array.from(state.sessions.values())
      .filter(s => sessionIds.includes(s.id))
      .sort((a, b) => a.order - b.order);

    const groupOrder = sessions.length > 0 ? sessions[0].order : groupCounter;

    const group: GroupInfo = {
      id,
      name: name || `Group ${groupCounter}`,
      color: color || 'gray',
      isCollapsed: false,
      order: groupOrder,
      createdAt: Date.now(),
    };

    set((state) => {
      const newGroups = new Map(state.groups);
      newGroups.set(id, group);

      // Update sessions to belong to this group
      const newSessions = new Map(state.sessions);
      sessionIds.forEach(sessionId => {
        const session = newSessions.get(sessionId);
        if (session && session.type === 'terminal') {
          newSessions.set(sessionId, { ...session, groupId: id });
        }
      });

      return { groups: newGroups, sessions: newSessions };
    });

    return id;
  },

  deleteGroup: async (groupId: string, deleteSessionsToo = false) => {
    const state = get();
    const sessionsInGroup = Array.from(state.sessions.values())
      .filter(s => s.groupId === groupId);

    if (deleteSessionsToo) {
      // Close all sessions in the group
      for (const session of sessionsInGroup) {
        await get().closeSession(session.id);
      }
    }

    set((state) => {
      const newGroups = new Map(state.groups);
      newGroups.delete(groupId);

      // If not deleting sessions, ungroup them
      if (!deleteSessionsToo) {
        const newSessions = new Map(state.sessions);
        sessionsInGroup.forEach(session => {
          newSessions.set(session.id, { ...session, groupId: null });
        });
        return { groups: newGroups, sessions: newSessions };
      }

      return { groups: newGroups };
    });
  },

  dissolveGroup: (groupId: string) => {
    set((state) => {
      const newGroups = new Map(state.groups);
      newGroups.delete(groupId);

      // Ungroup all sessions
      const newSessions = new Map(state.sessions);
      Array.from(newSessions.values())
        .filter(s => s.groupId === groupId)
        .forEach(session => {
          newSessions.set(session.id, { ...session, groupId: null });
        });

      return { groups: newGroups, sessions: newSessions };
    });
  },

  renameGroup: (groupId: string, name: string) => {
    set((state) => {
      const group = state.groups.get(groupId);
      if (!group) return state;

      const newGroups = new Map(state.groups);
      newGroups.set(groupId, { ...group, name });
      return { groups: newGroups };
    });
  },

  setGroupColor: (groupId: string, color: GroupColor) => {
    set((state) => {
      const group = state.groups.get(groupId);
      if (!group) return state;

      const newGroups = new Map(state.groups);
      newGroups.set(groupId, { ...group, color });
      return { groups: newGroups };
    });
  },

  toggleGroupCollapsed: (groupId: string) => {
    set((state) => {
      const group = state.groups.get(groupId);
      if (!group) return state;

      const newGroups = new Map(state.groups);
      newGroups.set(groupId, { ...group, isCollapsed: !group.isCollapsed });
      return { groups: newGroups };
    });
  },

  reorderGroups: (activeId: string, overId: string) => {
    set((state) => {
      const groupsList = Array.from(state.groups.values()).sort((a, b) => a.order - b.order);
      const oldIndex = groupsList.findIndex(g => g.id === activeId);
      const newIndex = groupsList.findIndex(g => g.id === overId);

      if (oldIndex === -1 || newIndex === -1) return state;

      const [removed] = groupsList.splice(oldIndex, 1);
      groupsList.splice(newIndex, 0, removed);

      const newGroups = new Map(state.groups);
      groupsList.forEach((group, index) => {
        newGroups.set(group.id, { ...group, order: index + 1 });
      });

      return { groups: newGroups };
    });
  },

  // Session-Group Actions
  addSessionToGroup: (sessionId: string, groupId: string) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      const group = state.groups.get(groupId);
      if (!session || !group || session.type === 'settings') return state;

      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, { ...session, groupId });

      // Check if old group is now empty and should be dissolved
      const newGroups = new Map(state.groups);
      if (session.groupId) {
        const remainingInOldGroup = Array.from(newSessions.values())
          .filter(s => s.groupId === session.groupId && s.id !== sessionId);
        if (remainingInOldGroup.length === 0) {
          newGroups.delete(session.groupId);
        }
      }

      return { sessions: newSessions, groups: newGroups };
    });
  },

  removeSessionFromGroup: (sessionId: string) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session || !session.groupId) return state;

      const oldGroupId = session.groupId;
      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, { ...session, groupId: null });

      // Check if group is now empty and should be dissolved
      const newGroups = new Map(state.groups);
      const remainingInGroup = Array.from(newSessions.values())
        .filter(s => s.groupId === oldGroupId);
      if (remainingInGroup.length === 0) {
        newGroups.delete(oldGroupId);
      }

      return { sessions: newSessions, groups: newGroups };
    });
  },

  createSessionInGroup: async (groupId: string) => {
    return get().createSession(undefined, groupId);
  },

  closeAllInGroup: async (groupId: string) => {
    const state = get();
    const sessionsInGroup = Array.from(state.sessions.values())
      .filter(s => s.groupId === groupId);

    for (const session of sessionsInGroup) {
      await get().closeSession(session.id);
    }
  },

  // Sidebar Helpers
  getSidebarItems: () => {
    const state = get();
    const terminalSessions = Array.from(state.sessions.values())
      .filter(s => s.type === 'terminal')
      .sort((a, b) => a.order - b.order);

    const groups = Array.from(state.groups.values())
      .sort((a, b) => a.order - b.order);

    const items: SidebarItem[] = [];
    const processedSessionIds = new Set<string>();

    // First, process all groups
    for (const group of groups) {
      const groupSessions = terminalSessions
        .filter(s => s.groupId === group.id)
        .sort((a, b) => a.order - b.order);

      if (groupSessions.length > 0) {
        items.push({ type: 'group', group, sessions: groupSessions });
        groupSessions.forEach(s => processedSessionIds.add(s.id));
      }
    }

    // Then add ungrouped sessions
    const ungroupedSessions = terminalSessions.filter(s => !processedSessionIds.has(s.id));
    for (const session of ungroupedSessions) {
      items.push({ type: 'session', session });
    }

    // Sort all items by order (using first session's order for groups)
    items.sort((a, b) => {
      const orderA = a.type === 'group' ? a.group.order : a.session.order;
      const orderB = b.type === 'group' ? b.group.order : b.session.order;
      return orderA - orderB;
    });

    return items;
  },

  getGroupSessions: (groupId: string) => {
    const state = get();
    return Array.from(state.sessions.values())
      .filter(s => s.groupId === groupId)
      .sort((a, b) => a.order - b.order);
  },
}));

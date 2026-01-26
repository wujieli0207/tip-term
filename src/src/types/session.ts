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

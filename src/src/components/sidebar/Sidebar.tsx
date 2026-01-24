import { useSessionStore } from "../../stores/sessionStore";
import SidebarHeader from "./SidebarHeader";
import SessionItem from "./SessionItem";

export default function Sidebar() {
  const { sidebarCollapsed, sidebarWidth, getSessionsList } = useSessionStore();
  const sessions = getSessionsList();

  console.log("[Sidebar] Render:", {
    sidebarCollapsed,
    sidebarWidth,
    sessionsCount: sessions.length,
  });

  if (sidebarCollapsed) {
    console.log("[Sidebar] Collapsed, returning null");
    return null;
  }

  return (
    <div
      className="flex flex-col h-full bg-[#1a1a1a] border-r border-[#2a2a2a]"
      style={{ width: sidebarWidth }}
    >
      <SidebarHeader />

      <div className="flex-1 overflow-y-auto py-2">
        {sessions.length === 0 ? (
          <div className="px-3 py-4 text-center text-gray-500 text-sm">
            No sessions yet.
            <br />
            Press <kbd className="px-1 py-0.5 bg-[#2a2a2a] rounded text-xs">Cmd+T</kbd> to create one.
          </div>
        ) : (
          <div className="space-y-0.5">
            {sessions.map((session) => (
              <SessionItem key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-[#2a2a2a]">
        <div className="text-xs text-gray-500">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}

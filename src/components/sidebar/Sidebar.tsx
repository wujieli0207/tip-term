import { useSessionStore } from "../../stores/sessionStore";
import { useSidebarStore } from "../../stores/sidebarStore";
import SidebarHeader from "./SidebarHeader";
import SessionTabContent from "./SessionTabContent";
import FileTreeTabContent from "./FileTreeTabContent";
import GitTabContent from "./GitTabContent";

export default function Sidebar() {
  const { collapsed, width, activeTab } = useSidebarStore();
  const {
    getTerminalSessions,
    groups,
  } = useSessionStore();

  const terminalSessions = getTerminalSessions();

  if (collapsed) {
    return null;
  }

  return (
    <div
      className="flex flex-col h-full bg-[#1a1a1a] border-r border-[#2a2a2a] overflow-visible"
      style={{ width }}
    >
      <SidebarHeader />

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'session' && <SessionTabContent />}
        {activeTab === 'filetree' && <FileTreeTabContent />}
        {activeTab === 'git' && <GitTabContent />}
      </div>

      {/* Session count footer - only show on session tab */}
      {activeTab === 'session' && (
        <div className="px-3 py-2 border-t border-[#2a2a2a]">
          <div className="text-xs text-gray-500">
            {terminalSessions.length} session{terminalSessions.length !== 1 ? "s" : ""}
            {groups.size > 0 && ` in ${groups.size} group${groups.size !== 1 ? "s" : ""}`}
          </div>
        </div>
      )}
    </div>
  );
}

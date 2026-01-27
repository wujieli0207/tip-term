import { useSessionStore } from "../../stores/sessionStore";
import { useSidebarStore } from "../../stores/sidebarStore";
import { IconPlus, IconMenu2, IconSettings } from "@/components/ui/icons";
import SidebarTabSelector from "./SidebarTabSelector";

interface SidebarHeaderProps {
  onSettingsClick?: () => void;
}

export default function SidebarHeader({ onSettingsClick }: SidebarHeaderProps) {
  const { createSession } = useSessionStore();
  const { toggle: toggleSidebar, activeTab } = useSidebarStore();

  const handleNewSession = async () => {
    try {
      await createSession();
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  return (
    <div className="flex items-center justify-between px-2 py-2 border-b border-[#2a2a2a] overflow-visible">
      {/* Left side: Tab selector */}
      <div className="flex items-center gap-1 overflow-visible">
        <SidebarTabSelector />
      </div>

      {/* Right side: Action buttons */}
      <div className="flex items-center gap-0.5">
        {/* New session button - only show on session tab */}
        {activeTab === 'session' && (
          <button
            onClick={handleNewSession}
            className="p-1.5 rounded hover:bg-[#2a2a2a] transition-colors"
            title="New Session (Cmd+T)"
          >
            <IconPlus className="w-4 h-4 text-gray-400 hover:text-gray-200" stroke={2} />
          </button>
        )}

        {/* Settings button */}
        <button
          onClick={onSettingsClick}
          className="p-1.5 rounded hover:bg-[#2a2a2a] transition-colors"
          title="Settings (Cmd+,)"
        >
          <IconSettings className="w-4 h-4 text-gray-400 hover:text-gray-200" stroke={2} />
        </button>

        {/* Collapse button */}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded hover:bg-[#2a2a2a] transition-colors"
          title="Toggle Sidebar (Cmd+\)"
        >
          <IconMenu2 className="w-4 h-4 text-gray-400 hover:text-gray-200" stroke={2} />
        </button>
      </div>
    </div>
  );
}

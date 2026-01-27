import { useSessionStore } from "../../stores/sessionStore";
import { useSidebarStore } from "../../stores/sidebarStore";
import { IconPlus, IconMenu2 } from "@/components/ui/icons";

export default function SidebarHeader() {
  const { createSession } = useSessionStore();
  const { toggle: toggleSidebar } = useSidebarStore();

  const handleNewSession = async () => {
    try {
      await createSession();
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a]">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        Sessions
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={handleNewSession}
          className="p-1 rounded hover:bg-[#2a2a2a] transition-colors"
          title="New Session (Cmd+T)"
        >
          <IconPlus className="w-4 h-4 text-gray-400 hover:text-gray-200" stroke={2} />
        </button>
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-[#2a2a2a] transition-colors"
          title="Toggle Sidebar (Cmd+\)"
        >
          <IconMenu2 className="w-4 h-4 text-gray-400 hover:text-gray-200" stroke={2} />
        </button>
      </div>
    </div>
  );
}

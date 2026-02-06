import { useSessionStore } from "../../stores/sessionStore";
import { useSidebarStore } from "../../stores/sidebarStore";
import { IconPlus } from "@/components/ui/icons";
import SidebarTabSelector from "./SidebarTabSelector";

export default function SidebarHeader() {
  const { createSession } = useSessionStore();
  const { activeTab } = useSidebarStore();

  const handleNewSession = async () => {
    try {
      await createSession();
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  return (
    <div className="flex items-center justify-between px-2 py-2 border-b border-border-subtle overflow-visible">
      {/* Left side: Tab selector */}
      <div className="flex items-center gap-1 overflow-visible">
        <SidebarTabSelector />
      </div>

      {/* Right side: New session button (only on session tab) */}
      {activeTab === 'session' && (
        <button
          onClick={handleNewSession}
          className="p-1.5 rounded hover:bg-bg-hover transition-colors"
          title="New Session (Cmd+T)"
        >
          <IconPlus className="w-4 h-4 text-text-muted hover:text-text-secondary" stroke={2} />
        </button>
      )}
    </div>
  );
}

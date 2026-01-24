import { useEffect, useRef } from "react";
import { SessionInfo, useSessionStore } from "../../stores/sessionStore";
import { requestNotificationPermission } from "../../utils/notifications";

interface SessionOptionsMenuProps {
  session: SessionInfo;
  onClose: () => void;
}

export default function SessionOptionsMenu({ session, onClose }: SessionOptionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { setNotifyWhenDone, setNotifyOnActivity } = useSessionStore();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleNotifyWhenDoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        return;
      }
    }
    setNotifyWhenDone(session.id, enabled);
  };

  const handleNotifyOnActivityChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        return;
      }
    }
    setNotifyOnActivity(session.id, enabled);
  };

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-[#2a2a2a] rounded-lg shadow-lg border border-[#3a3a3a] py-1"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Process info (read-only) */}
      {session.processName && (
        <div className="px-3 py-2 border-b border-[#3a3a3a]">
          <span className="text-xs text-gray-500">Current process</span>
          <div className="text-sm text-gray-300 truncate">{session.processName}</div>
        </div>
      )}

      {/* Notification options */}
      <div className="px-3 py-2 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer hover:bg-[#333333] -mx-2 px-2 py-1 rounded">
          <input
            type="checkbox"
            checked={session.notifyWhenDone || false}
            onChange={handleNotifyWhenDoneChange}
            className="w-4 h-4 rounded border-gray-500 bg-[#1a1a1a] text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
          />
          <span className="text-sm text-gray-300">Notify when done</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer hover:bg-[#333333] -mx-2 px-2 py-1 rounded">
          <input
            type="checkbox"
            checked={session.notifyOnActivity || false}
            onChange={handleNotifyOnActivityChange}
            className="w-4 h-4 rounded border-gray-500 bg-[#1a1a1a] text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
          />
          <span className="text-sm text-gray-300">Notify on activity</span>
        </label>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { SessionInfo, GROUP_COLORS, useSessionStore } from "../../stores/sessionStore";
import { requestNotificationPermission } from "../../utils/notifications";

interface SessionOptionsMenuProps {
  session: SessionInfo;
  onClose: () => void;
}

export default function SessionOptionsMenu({ session, onClose }: SessionOptionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    setNotifyWhenDone,
    setNotifyOnActivity,
    groups,
    createGroup,
    addSessionToGroup,
    removeSessionFromGroup,
  } = useSessionStore();

  const [showGroupSubmenu, setShowGroupSubmenu] = useState(false);

  const availableGroups = Array.from(groups.values()).filter(g => g.id !== session.groupId);

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
        if (showGroupSubmenu) {
          setShowGroupSubmenu(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showGroupSubmenu]);

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

  const handleCreateNewGroup = () => {
    createGroup([session.id]);
    onClose();
  };

  const handleAddToGroup = (groupId: string) => {
    addSessionToGroup(session.id, groupId);
    onClose();
  };

  const handleRemoveFromGroup = () => {
    removeSessionFromGroup(session.id);
    onClose();
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

      {/* Group options */}
      <div className="py-1 border-b border-[#3a3a3a]">
        {session.groupId ? (
          // Session is in a group - show remove option
          <button
            onClick={handleRemoveFromGroup}
            className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-[#333333] flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Remove from group
          </button>
        ) : (
          // Session is ungrouped - show add to group options
          <div className="relative">
            <button
              onClick={() => setShowGroupSubmenu(!showGroupSubmenu)}
              className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-[#333333] flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Add to group
              <svg className="w-3 h-3 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Group submenu */}
            {showGroupSubmenu && (
              <div
                className="absolute left-full top-0 ml-1 z-50 min-w-[160px] bg-[#2a2a2a] rounded-lg shadow-lg border border-[#3a3a3a] py-1"
              >
                {/* Create new group option */}
                <button
                  onClick={handleCreateNewGroup}
                  className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-[#333333] flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New group
                </button>

                {/* Existing groups */}
                {availableGroups.length > 0 && (
                  <>
                    <div className="h-px bg-[#3a3a3a] my-1" />
                    {availableGroups.map((group) => {
                      const colors = GROUP_COLORS[group.color];
                      return (
                        <button
                          key={group.id}
                          onClick={() => handleAddToGroup(group.id)}
                          className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-[#333333] flex items-center gap-2"
                        >
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: colors.text }}
                          />
                          <span className="truncate">{group.name}</span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

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

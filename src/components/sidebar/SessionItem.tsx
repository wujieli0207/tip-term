import { useState, useRef, useEffect } from 'react';
import { SessionInfo, useSessionStore, GROUP_COLORS } from "../../stores/sessionStore";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconTerminal2, IconDotsVertical, IconX, IconPlus, IconFolder } from "@/components/ui/icons";
import { requestNotificationPermission } from "../../utils/notifications";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface SessionItemProps {
  session: SessionInfo;
  index: number;
  inGroup?: boolean;
  isDropTarget?: boolean;
}

export default function SessionItem({ session, index, inGroup = false, isDropTarget = false }: SessionItemProps) {
  const {
    activeSessionId,
    setActiveSession,
    closeSession,
    setSessionCustomName,
    setNotifyWhenDone,
    setNotifyOnActivity,
    groups,
    createGroup,
    addSessionToGroup,
    removeSessionFromGroup,
  } = useSessionStore();
  const isActive = activeSessionId === session.id;
  const shortcutNumber = index + 1;
  const showShortcut = shortcutNumber <= 9;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableGroups = Array.from(groups.values()).filter(g => g.id !== session.groupId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: session.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Display priority:
  // 1. Custom name (user-set via double-click) - highest priority
  // 2. Terminal title (set by program via OSC)
  // 3. Current working directory (last component, skip if just "~")
  // 4. Process name
  // 5. Session name (fallback)
  const displayName = (() => {
    if (session.customName) {
      return session.customName;
    }
    if (session.terminalTitle && session.terminalTitle !== '~') {
      return session.terminalTitle;
    }
    if (session.cwd && session.cwd !== '~') {
      const parts = session.cwd.split('/').filter(Boolean);
      if (parts.length > 0) {
        return parts[parts.length - 1];
      }
    }
    if (session.processName) {
      return session.processName;
    }
    return session.name;
  })();

  // Auto-focus and select all text when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    setActiveSession(session.id);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeSession(session.id);
  };

  // Start inline editing on double-click
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(session.customName || displayName);
    setIsEditing(true);
  };

  // Save and exit edit mode
  const handleSave = () => {
    const trimmed = editValue.trim();
    setSessionCustomName(session.id, trimmed || null);
    setIsEditing(false);
  };

  // Cancel without saving
  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleNotifyWhenDoneChange = async (checked: boolean) => {
    if (checked) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }
    setNotifyWhenDone(session.id, checked);
  };

  const handleNotifyOnActivityChange = async (checked: boolean) => {
    if (checked) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }
    setNotifyOnActivity(session.id, checked);
  };

  const handleCreateNewGroup = () => {
    createGroup([session.id]);
  };

  const handleAddToGroup = (groupId: string) => {
    addSessionToGroup(session.id, groupId);
  };

  const handleRemoveFromGroup = () => {
    removeSessionFromGroup(session.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group flex items-center justify-between gap-2
        py-1.5 px-2 rounded-lg
        transition-all duration-150 relative
        ${inGroup ? 'mx-0.5' : 'mx-1'}
        ${isDragging ? 'z-50 shadow-lg opacity-50' : ''}
        ${isDropTarget ? 'ring-2 ring-purple-500 ring-inset scale-[1.02]' : ''}
        ${isActive
          ? inGroup
            ? "bg-[#ffffff15]"
            : "bg-[#333333] border-l-2 border-purple-500"
          : inGroup
            ? "hover:bg-[#ffffff10] border-l-0"
            : "hover:bg-[#2a2a2a] border-l-2 border-transparent"
        }
      `}
    >
      <div className="flex items-center flex-1 min-w-0 gap-2">
        <div className="relative flex-shrink-0">
          <IconTerminal2 className="w-4 h-4 text-gray-400" stroke={2} />
          {/* Notification indicator */}
          {(session.notifyWhenDone || session.notifyOnActivity) && (
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-500 rounded-full" />
          )}
        </div>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full text-sm text-gray-200 bg-transparent border-b border-blue-500 outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="text-sm text-gray-300 truncate"
            onDoubleClick={handleDoubleClick}
          >
            {displayName}
          </span>
        )}
      </div>

      <div className="flex items-center flex-shrink-0 gap-1">
        {showShortcut && !isHovered && !menuOpen && (
          <span className="font-mono text-xs text-gray-500">
            ⌘{shortcutNumber}
          </span>
        )}
        {(isHovered || menuOpen) && (
          <DropdownMenu onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-0.5 rounded hover:bg-[#444444] transition-opacity duration-150"
                title="Session options"
              >
                <IconDotsVertical className="w-3.5 h-3.5 text-gray-400 hover:text-gray-200" stroke={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]" onClick={(e) => e.stopPropagation()}>
              {/* Process info */}
              {session.processName && (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                    Current process: {session.processName}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Group options */}
              {session.groupId ? (
                <DropdownMenuItem onClick={handleRemoveFromGroup}>
                  <IconFolder className="w-4 h-4" stroke={2} />
                  Remove from group
                </DropdownMenuItem>
              ) : (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <IconFolder className="w-4 h-4" stroke={2} />
                    Add to group
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={handleCreateNewGroup}>
                      <IconPlus className="w-4 h-4" stroke={2} />
                      New group
                    </DropdownMenuItem>
                    {availableGroups.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        {availableGroups.map((group) => {
                          const colors = GROUP_COLORS[group.color];
                          return (
                            <DropdownMenuItem key={group.id} onClick={() => handleAddToGroup(group.id)}>
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: colors.text }}
                              />
                              <span className="truncate">{group.name}</span>
                            </DropdownMenuItem>
                          );
                        })}
                      </>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              <DropdownMenuSeparator />

              {/* Notification options */}
              <DropdownMenuCheckboxItem
                checked={session.notifyWhenDone || false}
                onCheckedChange={handleNotifyWhenDoneChange}
              >
                Notify when done
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={session.notifyOnActivity || false}
                onCheckedChange={handleNotifyOnActivityChange}
              >
                Notify on activity
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <button
          onClick={handleClose}
          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#444444] transition-opacity duration-150"
          title="Close session"
        >
          <IconX className="w-3.5 h-3.5 text-gray-400 hover:text-gray-200" stroke={2} />
        </button>
      </div>
    </div>
  );
}

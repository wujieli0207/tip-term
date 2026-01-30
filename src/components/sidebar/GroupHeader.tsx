import { useState, useRef, useEffect } from 'react';
import { GroupInfo, GroupColor, GROUP_COLORS, useSessionStore } from '../../stores/sessionStore';
import {
  IconChevronRight,
  IconChevronDown,
  IconPlus,
  IconDotsVertical,
  IconX,
  IconTrash,
  IconFolderMinus,
} from "@/components/ui/icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const COLOR_ORDER: GroupColor[] = [
  'gray', 'blue', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'cyan',
];

interface GroupHeaderProps {
  group: GroupInfo;
}

export default function GroupHeader({ group }: GroupHeaderProps) {
  const {
    toggleGroupCollapsed,
    renameGroup,
    createSessionInGroup,
    dissolveGroup,
    deleteGroup,
    closeAllInGroup,
    setGroupColor,
    getGroupSessions,
  } = useSessionStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const colors = GROUP_COLORS[group.color];

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(group.name);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed) {
      renameGroup(group.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleGroupCollapsed(group.id);
  };

  const handleAddSession = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await createSessionInGroup(group.id);
  };

  const handleNewSessionFromMenu = async () => {
    await createSessionInGroup(group.id);
  };

  const handleColorSelect = (color: GroupColor) => {
    setGroupColor(group.id, color);
  };

  const handleUngroup = () => {
    dissolveGroup(group.id);
  };

  const handleCloseAll = async () => {
    await closeAllInGroup(group.id);
  };

  const handleDelete = async () => {
    await deleteGroup(group.id, true);
  };

  const sessionCount = getGroupSessions(group.id).length;

  return (
    <div
      className="group flex items-center gap-2 h-8 px-1.5 rounded-md hover:bg-bg-hover cursor-pointer transition-colors relative"
      onClick={handleToggle}
    >
      {/* Collapse arrow */}
      <button
        onClick={handleToggle}
        className="flex-shrink-0 p-0.5 hover:bg-bg-active rounded transition-colors"
      >
        {group.isCollapsed ? (
          <IconChevronRight className="w-3.5 h-3.5 text-text-muted" stroke={2} />
        ) : (
          <IconChevronDown className="w-3.5 h-3.5 text-text-muted" stroke={2} />
        )}
      </button>

      {/* Color pill */}
      <div
        className="flex-shrink-0 w-2 h-2 rounded-full"
        style={{ backgroundColor: colors.text }}
      />

      {/* Group name */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-[13px] text-text-primary bg-transparent border-b border-accent-primary outline-none"
          />
        ) : (
          <span
            className={`text-[13px] font-medium truncate block ${
              group.isCollapsed ? 'text-text-secondary' : 'text-text-primary'
            }`}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={handleDoubleClick}
          >
            {group.name}
          </span>
        )}
      </div>

      {/* Count badge - only shows when collapsed and has sessions */}
      {group.isCollapsed && sessionCount > 0 && (
        <span className="text-[11px] text-text-muted font-normal">
          {sessionCount}
        </span>
      )}

      {/* Menu button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-0.5 rounded hover:bg-bg-hover transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
            title="Group options"
          >
            <IconDotsVertical className="w-3.5 h-3.5 text-text-muted hover:text-text-secondary" stroke={2} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-[220px] rounded-xl border-border bg-bg-card p-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5 text-[13px] font-medium text-text-primary">
            <span
              className="flex-shrink-0 w-2 h-2 rounded-full"
              style={{ backgroundColor: colors.text }}
            />
            {group.name}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border-subtle" />

          {/* New session */}
          <DropdownMenuItem onClick={handleNewSessionFromMenu}>
            <IconPlus className="w-4 h-4" stroke={2} />
            New session
          </DropdownMenuItem>

          {/* Inline color picker */}
          <div className="flex items-center gap-2 px-2 py-2">
            {COLOR_ORDER.map((color) => {
              const colorDef = GROUP_COLORS[color];
              const isSelected = color === group.color;
              return (
                <button
                  key={color}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleColorSelect(color);
                  }}
                  className={`w-3 h-3 rounded-full transition-transform hover:scale-125 ${
                    isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-popover' : ''
                  }`}
                  style={{ backgroundColor: colorDef.text }}
                  title={color.charAt(0).toUpperCase() + color.slice(1)}
                />
              );
            })}
          </div>

          <DropdownMenuSeparator className="bg-border-subtle" />

          {/* Ungroup */}
          <DropdownMenuItem onClick={handleUngroup}>
            <IconFolderMinus className="w-4 h-4" stroke={2} />
            Ungroup all
          </DropdownMenuItem>

          {/* Close all sessions */}
          <DropdownMenuItem onClick={handleCloseAll}>
            <IconX className="w-4 h-4" stroke={2} />
            Close all sessions
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-border-subtle" />

          {/* Delete group */}
          <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
            <IconTrash className="w-4 h-4" stroke={2} />
            Delete group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Add session button */}
      <button
        onClick={handleAddSession}
        className="p-0.5 rounded hover:bg-bg-hover transition-colors flex-shrink-0"
        title="Add session to group"
      >
        <IconPlus className="w-3.5 h-3.5 text-text-muted hover:text-text-secondary" stroke={2} />
      </button>
    </div>
  );
}

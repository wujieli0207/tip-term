import { useState, useRef, useEffect } from 'react';
import { GroupInfo, GroupColor, GROUP_COLORS, useSessionStore } from '../../stores/sessionStore';
import { IconChevronRight, IconPlus, IconDotsVertical, IconX } from "@/components/ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const COLOR_ORDER: GroupColor[] = [
  'gray', 'blue', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'cyan'
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
  } = useSessionStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
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
    setMenuOpen(false);
  };

  const handleColorSelect = (color: GroupColor) => {
    setGroupColor(group.id, color);
  };

  const handleUngroup = () => {
    dissolveGroup(group.id);
    setMenuOpen(false);
  };

  const handleCloseAll = async () => {
    await closeAllInGroup(group.id);
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    await deleteGroup(group.id, true);
    setMenuOpen(false);
  };

  return (
    <div
      className="flex items-center gap-2 py-1.5 px-2 mx-1 rounded-lg hover:bg-[#2a2a2a] cursor-pointer transition-colors relative"
      onClick={handleToggle}
    >
      {/* Collapse arrow */}
      <button
        onClick={handleToggle}
        className="flex-shrink-0 p-0.5 hover:bg-[#3a3a3a] rounded transition-colors"
      >
        <IconChevronRight
          className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
            group.isCollapsed ? '' : 'rotate-90'
          }`}
          stroke={2}
        />
      </button>

      {/* Color pill */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
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
            className="w-full text-sm bg-transparent border-b border-blue-500 outline-none"
            style={{ color: colors.text }}
          />
        ) : (
          <span
            className="text-sm font-medium truncate block"
            style={{ color: colors.text }}
            onDoubleClick={handleDoubleClick}
          >
            {group.name}
          </span>
        )}
      </div>

      {/* Add session button */}
      <button
        onClick={handleAddSession}
        className="p-0.5 rounded hover:bg-[#444444] transition-colors flex-shrink-0"
        title="Add session to group"
      >
        <IconPlus className="w-3.5 h-3.5 text-gray-400 hover:text-gray-200" stroke={2} />
      </button>

      {/* Menu button */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="p-0.5 rounded hover:bg-[#444444] transition-colors flex-shrink-0"
          title="Group options"
        >
          <IconDotsVertical className="w-3.5 h-3.5 text-gray-400 hover:text-gray-200" stroke={2} />
        </button>
        <DropdownMenuContent align="end" className="w-[180px]" onClick={(e) => e.stopPropagation()}>
          {/* New session */}
          <DropdownMenuItem onClick={handleNewSessionFromMenu}>
            <IconPlus className="w-4 h-4" stroke={2} />
            New session
          </DropdownMenuItem>

          {/* Inline color picker */}
          <div className="px-2 py-2 flex items-center gap-2">
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
                  className={`w-4 h-4 rounded-full transition-transform hover:scale-125 ${
                    isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-popover' : ''
                  }`}
                  style={{ backgroundColor: colorDef.text }}
                  title={color.charAt(0).toUpperCase() + color.slice(1)}
                />
              );
            })}
          </div>

          <DropdownMenuSeparator />

          {/* Ungroup */}
          <DropdownMenuItem onClick={handleUngroup}>
            Ungroup all
          </DropdownMenuItem>

          {/* Close all sessions */}
          <DropdownMenuItem onClick={handleCloseAll}>
            <IconX className="w-4 h-4" stroke={2} />
            Close all sessions
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Delete group */}
          <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
            Delete group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

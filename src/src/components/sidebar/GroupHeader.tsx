import { useState, useRef, useEffect } from 'react';
import { GroupInfo, GROUP_COLORS, useSessionStore } from '../../stores/sessionStore';
import GroupOptionsMenu from './GroupOptionsMenu';

interface GroupHeaderProps {
  group: GroupInfo;
}

export default function GroupHeader({ group }: GroupHeaderProps) {
  const { toggleGroupCollapsed, renameGroup, createSessionInGroup } = useSessionStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleAddSession = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await createSessionInGroup(group.id);
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
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
            group.isCollapsed ? '' : 'rotate-90'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
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
        <svg
          className="w-3.5 h-3.5 text-gray-400 hover:text-gray-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Menu button */}
      <button
        ref={menuButtonRef}
        onClick={handleMenuClick}
        className="p-0.5 rounded hover:bg-[#444444] transition-colors flex-shrink-0"
        title="Group options"
      >
        <svg
          className="w-3.5 h-3.5 text-gray-400 hover:text-gray-200"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {/* Options menu */}
      {menuOpen && (
        <GroupOptionsMenu
          group={group}
          onClose={() => setMenuOpen(false)}
          anchorRef={menuButtonRef}
        />
      )}
    </div>
  );
}

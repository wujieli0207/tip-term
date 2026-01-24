import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GroupInfo, GroupColor, GROUP_COLORS, useSessionStore } from '../../stores/sessionStore';

interface GroupOptionsMenuProps {
  group: GroupInfo;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement>;
}

const COLOR_ORDER: GroupColor[] = [
  'gray', 'blue', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'cyan'
];

export default function GroupOptionsMenu({ group, onClose, anchorRef }: GroupOptionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { dissolveGroup, deleteGroup, closeAllInGroup, createSessionInGroup, setGroupColor } = useSessionStore();
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate position based on anchor element
  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: Math.min(rect.right - 180, window.innerWidth - 190), // Keep menu in viewport
      });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleNewSession = async () => {
    await createSessionInGroup(group.id);
    onClose();
  };

  const handleColorSelect = (color: GroupColor) => {
    setGroupColor(group.id, color);
  };

  const handleUngroup = () => {
    dissolveGroup(group.id);
    onClose();
  };

  const handleCloseAll = async () => {
    await closeAllInGroup(group.id);
    onClose();
  };

  const handleDelete = async () => {
    await deleteGroup(group.id, true);
    onClose();
  };

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[180px] bg-[#2a2a2a] rounded-lg shadow-lg border border-[#3a3a3a] py-1"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* New session in group */}
      <button
        onClick={handleNewSession}
        className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-[#333333] flex items-center gap-2"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New session
      </button>

      {/* Inline color picker */}
      <div className="px-3 py-2 flex items-center gap-2">
        {COLOR_ORDER.map((color) => {
          const colors = GROUP_COLORS[color];
          const isSelected = color === group.color;

          return (
            <button
              key={color}
              onClick={() => handleColorSelect(color)}
              className={`w-4 h-4 rounded-full transition-transform hover:scale-125 ${
                isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-[#2a2a2a]' : ''
              }`}
              style={{ backgroundColor: colors.text }}
              title={color.charAt(0).toUpperCase() + color.slice(1)}
            />
          );
        })}
      </div>

      <div className="h-px bg-[#3a3a3a] my-1" />

      {/* Ungroup */}
      <button
        onClick={handleUngroup}
        className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-[#333333] flex items-center gap-2"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        Ungroup all
      </button>

      {/* Close all sessions */}
      <button
        onClick={handleCloseAll}
        className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-[#333333] flex items-center gap-2"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Close all sessions
      </button>

      <div className="h-px bg-[#3a3a3a] my-1" />

      {/* Delete group */}
      <button
        onClick={handleDelete}
        className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-[#333333] flex items-center gap-2"
      >
        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete group
      </button>
    </div>
  );

  return createPortal(menuContent, document.body);
}

import { useState, useRef, useEffect } from 'react';
import { SessionInfo, useSessionStore } from "../../stores/sessionStore";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SessionItemProps {
  session: SessionInfo;
  index: number;
}

export default function SessionItem({ session, index }: SessionItemProps) {
  const { activeSessionId, setActiveSession, closeSession, setSessionCustomName } = useSessionStore();
  const isActive = activeSessionId === session.id;
  const shortcutNumber = index + 1;
  const showShortcut = shortcutNumber <= 9;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`
        group flex items-center justify-between gap-2
        py-1.5 px-2 mx-1 rounded-lg
        transition-colors duration-150
        ${isDragging ? 'z-50 shadow-lg' : ''}
        ${isActive
          ? "bg-[#333333] border-l-2 border-purple-500"
          : "hover:bg-[#2a2a2a] border-l-2 border-transparent"
        }
      `}
    >
      <div className="flex items-center flex-1 min-w-0 gap-2">
        <svg
          className="flex-shrink-0 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
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
        {showShortcut && (
          <span className="font-mono text-xs text-gray-500">
            ⌘{shortcutNumber}
          </span>
        )}
        <button
          onClick={handleClose}
          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#444444] transition-opacity duration-150"
          title="Close session"
        >
          <svg
            className="w-3.5 h-3.5 text-gray-400 hover:text-gray-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

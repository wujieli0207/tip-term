import { useSessionStore } from "../../stores/sessionStore";
import SidebarHeader from "./SidebarHeader";
import SessionItem from "./SessionItem";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export default function Sidebar() {
  const { sidebarCollapsed, sidebarWidth, getTerminalSessions, reorderSessions, openSettings } = useSessionStore();
  const sessions = getTerminalSessions();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts (allows clicks)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderSessions(active.id as string, over.id as string);
    }
  };

  if (sidebarCollapsed) {
    return null;
  }

  return (
    <div
      className="flex flex-col h-full bg-[#1a1a1a] border-r border-[#2a2a2a]"
      style={{ width: sidebarWidth }}
    >
      <SidebarHeader />

      <div className="flex-1 py-2 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="px-3 py-4 text-sm text-center text-gray-500">
            No sessions yet.
            <br />
            Press <kbd className="px-1 py-0.5 bg-[#2a2a2a] rounded text-xs">Cmd+T</kbd> to create one.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sessions.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0.5">
                {sessions.map((session, index) => (
                  <SessionItem key={session.id} session={session} index={index} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="px-3 py-2 border-t border-[#2a2a2a] space-y-2">
        <div className="text-xs text-gray-500">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
        </div>
        <button
          onClick={openSettings}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#2a2a2a] transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm text-gray-300">Settings</span>
          <kbd className="ml-auto text-xs text-gray-500 bg-[#2a2a2a] px-1.5 py-0.5 rounded">⌘,</kbd>
        </button>
      </div>
    </div>
  );
}

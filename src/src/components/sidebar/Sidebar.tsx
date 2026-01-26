import { useState, useRef, useEffect } from 'react';
import { useSessionStore } from "../../stores/sessionStore";
import { useSidebarStore } from "../../stores/sidebarStore";
import SidebarHeader from "./SidebarHeader";
import SessionItem from "./SessionItem";
import GroupContainer from "./GroupContainer";
import DragMergeOverlay from "./DragMergeOverlay";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

const MERGE_DELAY_MS = 300;

export default function Sidebar() {
  const { collapsed, width } = useSidebarStore();
  const {
    getSidebarItems,
    getTerminalSessions,
    reorderSessions,
    openSettings,
    createGroup,
    addSessionToGroup,
    removeSessionFromGroup,
    sessions,
    groups,
  } = useSessionStore();

  const sidebarItems = getSidebarItems();
  const terminalSessions = getTerminalSessions();

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [showMergePreview, setShowMergePreview] = useState(false);
  const mergeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get the active session for drag overlay
  const activeSession = activeId ? sessions.get(activeId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Clear merge timer on unmount
  useEffect(() => {
    return () => {
      if (mergeTimerRef.current) {
        clearTimeout(mergeTimerRef.current);
      }
    };
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setShowMergePreview(false);
    if (mergeTimerRef.current) {
      clearTimeout(mergeTimerRef.current);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setOverId(null);
      setShowMergePreview(false);
      if (mergeTimerRef.current) {
        clearTimeout(mergeTimerRef.current);
        mergeTimerRef.current = null;
      }
      return;
    }

    const newOverId = over.id as string;
    const activeSession = sessions.get(active.id as string);
    const overSession = sessions.get(newOverId);

    // Check if hovering over a different ungrouped session (potential merge)
    const canMerge = activeSession &&
      overSession &&
      activeSession.id !== overSession.id &&
      !activeSession.groupId &&
      !overSession.groupId;

    if (newOverId !== overId) {
      setOverId(newOverId);
      setShowMergePreview(false);

      if (mergeTimerRef.current) {
        clearTimeout(mergeTimerRef.current);
        mergeTimerRef.current = null;
      }

      if (canMerge) {
        mergeTimerRef.current = setTimeout(() => {
          setShowMergePreview(true);
        }, MERGE_DELAY_MS);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (mergeTimerRef.current) {
      clearTimeout(mergeTimerRef.current);
      mergeTimerRef.current = null;
    }

    const wasShowingMergePreview = showMergePreview;
    setActiveId(null);
    setOverId(null);
    setShowMergePreview(false);

    if (!over || active.id === over.id) {
      return;
    }

    const activeSessionId = active.id as string;
    const overId = over.id as string;
    const activeSession = sessions.get(activeSessionId);
    const overSession = sessions.get(overId);

    if (!activeSession) return;

    // Case 1: Merge two ungrouped sessions into a new group
    if (wasShowingMergePreview && overSession && !activeSession.groupId && !overSession.groupId) {
      createGroup([overSession.id, activeSession.id]);
      return;
    }

    // Case 2: Dropping onto a group container (groupId starts with "group-")
    if (overId.startsWith('group-')) {
      // Add session to the group
      if (activeSession.groupId !== overId) {
        addSessionToGroup(activeSessionId, overId);
      }
      return;
    }

    // Case 3: Dropping onto the ungrouped area (remove from group)
    if (overId === 'ungrouped-area' && activeSession.groupId) {
      removeSessionFromGroup(activeSessionId);
      return;
    }

    // Case 4: Dropping onto a session that's in a group (add to that group)
    if (overSession?.groupId && !activeSession.groupId) {
      addSessionToGroup(activeSessionId, overSession.groupId);
      return;
    }

    // Case 5: Standard reordering
    if (overSession) {
      reorderSessions(activeSessionId, overId);
    }
  };

  const handleDragCancel = () => {
    if (mergeTimerRef.current) {
      clearTimeout(mergeTimerRef.current);
      mergeTimerRef.current = null;
    }
    setActiveId(null);
    setOverId(null);
    setShowMergePreview(false);
  };

  if (collapsed) {
    return null;
  }

  // Get all sortable IDs (sessions + group containers)
  const sortableIds: string[] = [];
  sidebarItems.forEach(item => {
    if (item.type === 'group') {
      sortableIds.push(item.group.id);
      item.sessions.forEach(s => sortableIds.push(s.id));
    } else {
      sortableIds.push(item.session.id);
    }
  });

  return (
    <div
      className="flex flex-col h-full bg-[#1a1a1a] border-r border-[#2a2a2a]"
      style={{ width }}
    >
      <SidebarHeader />

      <div className="flex-1 py-2 overflow-y-auto">
        {terminalSessions.length === 0 ? (
          <div className="px-3 py-4 text-sm text-center text-gray-500">
            No sessions yet.
            <br />
            Press <kbd className="px-1 py-0.5 bg-[#2a2a2a] rounded text-xs">Cmd+T</kbd> to create one.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={sortableIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0.5">
                {sidebarItems.map((item) => {
                  if (item.type === 'group') {
                    return (
                      <GroupContainer
                        key={item.group.id}
                        group={item.group}
                      >
                        {item.sessions.map((session, index) => (
                          <SessionItem
                            key={session.id}
                            session={session}
                            index={index}
                            inGroup={true}
                          />
                        ))}
                      </GroupContainer>
                    );
                  } else {
                    const globalIndex = terminalSessions.findIndex(s => s.id === item.session.id);
                    return (
                      <SessionItem
                        key={item.session.id}
                        session={item.session}
                        index={globalIndex}
                        inGroup={false}
                        isDropTarget={overId === item.session.id && showMergePreview}
                      />
                    );
                  }
                })}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeSession && (
                <DragMergeOverlay
                  session={activeSession}
                  showMergePreview={showMergePreview}
                />
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <div className="px-3 py-2 border-t border-[#2a2a2a] space-y-2">
        <div className="text-xs text-gray-500">
          {terminalSessions.length} session{terminalSessions.length !== 1 ? "s" : ""}
          {groups.size > 0 && ` in ${groups.size} group${groups.size !== 1 ? "s" : ""}`}
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

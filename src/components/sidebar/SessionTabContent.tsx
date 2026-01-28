import { useState, useRef, useEffect } from 'react';
import { useSessionStore } from "../../stores/sessionStore";
import SessionItem from "./SessionItem";
import SettingsItem from "./SettingsItem";
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

export default function SessionTabContent() {
  const {
    getSidebarItems,
    getTerminalSessions,
    getSettingsSession,
    reorderSessions,
    createGroup,
    addSessionToGroup,
    removeSessionFromGroup,
    sessions,
  } = useSessionStore();

  const sidebarItems = getSidebarItems();
  const terminalSessions = getTerminalSessions();
  const settingsSession = getSettingsSession();

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

  if (terminalSessions.length === 0 && !settingsSession) {
    return (
      <div className="px-3 py-4 text-sm text-center text-gray-500">
        No sessions yet.
        <br />
        Press <kbd className="px-1 py-0.5 bg-[#2a2a2a] rounded text-xs">Cmd+T</kbd> to create one.
      </div>
    );
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
    <div className="flex-1 overflow-y-auto">
      {/* Settings item - always at top, not draggable */}
      {settingsSession && (
        <>
          <SettingsItem />
          {terminalSessions.length > 0 && (
            <div className="mx-3 my-2 border-t border-[#3a3a3a]" />
          )}
        </>
      )}

      {/* Terminal sessions - draggable */}
      {terminalSessions.length > 0 && (
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
  );
}

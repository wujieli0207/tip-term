import { useEffect } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { useSidebarStore } from '../../stores/sidebarStore'
import { useResizable } from '../../hooks/useResizable'
import SidebarHeader from './SidebarHeader'
import SessionTabContent from './SessionTabContent'
import FileTreeTabContent from './FileTreeTabContent'
import GitTabContent from './GitTabContent'

function ResizeHandle({
  onMouseDown,
  isResizing,
}: {
  onMouseDown: (e: React.MouseEvent) => void
  isResizing: boolean
}) {
  return (
    <div
      className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize
        bg-[#333] hover:bg-purple-500 transition-colors z-10
        ${isResizing ? 'bg-purple-500' : ''}`}
      onMouseDown={onMouseDown}
    />
  )
}

export default function Sidebar() {
  const { collapsed, width, activeTab, setWidth } = useSidebarStore()
  const { getTerminalSessions, groups } = useSessionStore()

  const terminalSessions = getTerminalSessions()

  const { panelRef, isResizing, handleMouseDown } = useResizable({
    onResize: (newWidth) => setWidth(newWidth),
    direction: 'right',
  })

  useEffect(() => {
    if (isResizing) {
      document.body.style.userSelect = 'none'
    } else {
      document.body.style.userSelect = ''
    }
    return () => {
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  if (collapsed) {
    return null
  }

  return (
    <div
      ref={panelRef}
      className="flex flex-col h-full bg-[#1a1a1a] border-r border-[#2a2a2a] overflow-visible relative"
      style={{ width }}
    >
      <SidebarHeader />

      {/* Tab content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {activeTab === 'session' && <SessionTabContent />}
        {activeTab === 'filetree' && <FileTreeTabContent />}
        {activeTab === 'git' && <GitTabContent />}
      </div>

      {/* Session count footer - only show on session tab */}
      {activeTab === 'session' && (
        <div className="px-3 py-2 border-t border-[#2a2a2a]">
          <div className="text-xs text-gray-500">
            {terminalSessions.length} session
            {terminalSessions.length !== 1 ? 's' : ''}
            {groups.size > 0 &&
              ` in ${groups.size} group${groups.size !== 1 ? 's' : ''}`}
          </div>
        </div>
      )}

      <ResizeHandle onMouseDown={handleMouseDown} isResizing={isResizing} />
    </div>
  )
}

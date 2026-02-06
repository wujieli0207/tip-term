import { useEffect } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import FileTreeHeader from '../filetree/FileTreeHeader'
import FileTreeView from '../filetree/FileTreeView'

export default function FileTreeTabContent() {
  const { activeSessionId, sessions } = useSessionStore()
  const { initSessionTree } = useFileTreeStore()

  const activeSession = activeSessionId ? sessions.get(activeSessionId) : null
  const cwd = activeSession?.cwd

  // Initialize tree when session or cwd changes
  useEffect(() => {
    if (activeSessionId && cwd) {
      initSessionTree(activeSessionId, cwd)
    }
  }, [activeSessionId, cwd, initSessionTree])

  // Don't show if no active terminal session or no cwd
  if (!activeSessionId || activeSession?.type !== 'terminal' || !cwd) {
    return (
      <div className="px-3 py-4 text-sm text-center text-text-muted">
        No active session or working directory.
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <FileTreeHeader sessionId={activeSessionId} />
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <FileTreeView sessionId={activeSessionId} />
      </div>
    </div>
  )
}

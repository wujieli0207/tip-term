import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { IconMenu2, IconSettings, IconSearch } from '@/components/ui/icons'
import { useSidebarStore } from '@/stores/sidebarStore'
import { useSessionStore, SETTINGS_SESSION_ID } from '@/stores/sessionStore'
import { useQuickOpenStore } from '@/stores/quickOpenStore'

export default function TitleBar() {
  const [osPlatform, setOsPlatform] = useState<string>('unknown')
  const { toggle: toggleSidebar } = useSidebarStore()
  const { openSettings, closeSettings, activeSessionId } = useSessionStore()
  const { open: openQuickOpen } = useQuickOpenStore()

  // Detect platform on mount
  useEffect(() => {
    invoke<string>('get_platform').then(setOsPlatform).catch(console.error)
  }, [])

  const isMac = osPlatform === 'macos'

  const handleSettingsClick = () => {
    if (activeSessionId === SETTINGS_SESSION_ID) {
      closeSettings()
    } else {
      openSettings()
    }
  }

  return (
    <div className="flex items-center h-[32px] bg-[var(--bg-card)] border-b border-[var(--border)] select-none shrink-0"
     data-tauri-drag-region>
      {/* macOS: Reserve space for native traffic lights */}
      {isMac && <div className="w-20 shrink-0" />}

      {/* Left side: Toggle button and draggable title */}
      <div data-tauri-drag-region className="flex items-center gap-3 pl-3">
        {/* Toggle button - visible on all platforms */}
        <button
          onClick={toggleSidebar}
          data-tauri-drag-region="false"
          className="p-2 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
          title="Toggle Sidebar (Cmd+\)"
        >
          <IconMenu2
            className="w-5 h-5 text-[var(--text-secondary)]"
            stroke={2}
          />
        </button>
      </div>

      {/* Center: Draggable area */}
      <div data-tauri-drag-region className="flex-1" />

      {/* Right side: Search and Settings buttons */}
      <div className="flex items-center gap-2 pr-4">
        <button
          onClick={openQuickOpen}
          data-tauri-drag-region="false"
          className="p-2 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
          title="Quick Open (Cmd+P)"
        >
          <IconSearch
            className="w-5 h-5 text-[var(--text-secondary)]"
            stroke={2}
          />
        </button>
        <button
          onClick={handleSettingsClick}
          data-tauri-drag-region="false"
          className="p-2 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
          title="Settings (Cmd+,)"
        >
          <IconSettings
            className="w-5 h-5 text-[var(--text-secondary)]"
            stroke={2}
          />
        </button>
      </div>

      {/* Windows/Linux: Reserve space for native controls */}
      {!isMac && <div className="w-20 shrink-0" />}
    </div>
  )
}

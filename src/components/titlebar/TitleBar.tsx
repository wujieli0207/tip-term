import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import SearchBox from './SearchBox'
import { IconMenu2, IconSettings } from '@/components/ui/icons'
import { useSidebarStore } from '@/stores/sidebarStore'
import { useSessionStore, SETTINGS_SESSION_ID } from '@/stores/sessionStore'

export default function TitleBar() {
  const [osPlatform, setOsPlatform] = useState<string>('unknown')
  const { toggle: toggleSidebar } = useSidebarStore()
  const { openSettings, closeSettings, activeSessionId } = useSessionStore()

  // Detect platform on mount
  useEffect(() => {
    invoke<string>('get_platform').then(setOsPlatform).catch(console.error)
  }, [])

  const isMac = osPlatform === 'macos'

  const handleDoubleClick = async () => {
    try {
      await invoke('maximize_window')
    } catch (error) {
      console.error('Failed to maximize window:', error)
    }
  }

  const handleSettingsClick = () => {
    if (activeSessionId === SETTINGS_SESSION_ID) {
      closeSettings()
    } else {
      openSettings()
    }
  }

  return (
    <div className="flex items-center h-8 bg-[#1a1a1a] border-b border-[#2a2a2a] select-none shrink-0">
      {/* macOS: Reserve space for native traffic lights */}
      {isMac && <div className="w-[88px] shrink-0" />}

      {/* Left side: Toggle button and draggable title */}
      <div data-tauri-drag-region className="flex items-center gap-2">
        {/* Toggle button - visible on all platforms */}
        <button
          onClick={toggleSidebar}
          data-tauri-drag-region="false"
          className="p-1 rounded hover:bg-[#2a2a2a] transition-colors"
          title="Toggle Sidebar (Cmd+\)"
        >
          <IconMenu2
            className="w-4 h-4 text-gray-400 hover:text-gray-200"
            stroke={2}
          />
        </button>

        {/* Draggable title - uses native data-tauri-drag-region for dragging */}
        <div
          data-tauri-drag-region
          onDoubleClick={handleDoubleClick}
          className="text-sm font-medium text-gray-300 cursor-default px-2 py-0.5 rounded hover:bg-[#2a2a2a] transition-colors"
        >
          TipTerm
        </div>
      </div>

      {/* Center: Search box */}
      <div data-tauri-drag-region className="flex-1 flex justify-center px-4">
        <SearchBox />
      </div>

      {/* Right side: Settings button */}
      <button
        onClick={handleSettingsClick}
        data-tauri-drag-region="false"
        className="p-1.5 rounded hover:bg-[#2a2a2a] transition-colors"
        title="Settings (Cmd+,)"
      >
        <IconSettings
          className="w-4 h-4 text-gray-400 hover:text-gray-200"
          stroke={2}
        />
      </button>

      {/* Windows/Linux: Reserve space for native controls */}
      {!isMac && <div className="w-[88px] shrink-0" />}
    </div>
  )
}

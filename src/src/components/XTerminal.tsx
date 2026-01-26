import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { useSidebarStore } from '../stores/sidebarStore'
import { useSettingsStore } from '../stores/settingsStore'
import { invoke } from '@tauri-apps/api/core'
import { attachTerminal, detachTerminal } from '../utils/terminalRegistry'
import type { TerminalEntry } from '../utils/terminalRegistry'

interface XTerminalProps {
  sessionId: string
  isFocusedPane?: boolean // For split pane support - defaults to true for single-pane usage
  isRootActive?: boolean
}

export default function XTerminal({
  sessionId,
  isFocusedPane = true,
  isRootActive = true,
}: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<TerminalEntry['fitAddon'] | null>(null)

  const sidebarCollapsed = useSidebarStore((state) => state.collapsed)

  const cursorStyle = useSettingsStore((state) => state.appearance.cursorStyle)
  const cursorBlink = useSettingsStore((state) => state.appearance.cursorBlink)

  // Initialize terminal
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const entry = attachTerminal(sessionId, container)
    terminalRef.current = entry.terminal
    fitAddonRef.current = entry.fitAddon

    const doFit = () => {
      if (!fitAddonRef.current || !terminalRef.current || !containerRef.current) return
      
      // Check if container has valid dimensions before fitting
      const rect = containerRef.current.getBoundingClientRect()
      if (rect.width < 10 || rect.height < 10) {
        // Container not ready yet, skip this fit attempt
        return false
      }

      try {
        fitAddonRef.current.fit()
        const { cols, rows } = terminalRef.current
        if (cols > 0 && rows > 0) {
          invoke('resize_terminal', { id: sessionId, cols, rows }).catch(
            console.error,
          )
          return true
        }
      } catch (e) {
        console.warn('[XTerminal] fit failed:', e)
      }
      return false
    }

    // Use requestAnimationFrame to ensure layout is complete
    // Try multiple times with exponential backoff for nested split panes
    let rafId2: number | null = null
    let timeoutId: number | null = null
    
    const rafId1 = requestAnimationFrame(() => {
      if (!doFit()) {
        rafId2 = requestAnimationFrame(() => {
          if (!doFit()) {
            // Final attempt after a longer delay for complex layouts
            timeoutId = setTimeout(doFit, 100) as unknown as number
          }
        })
      }
    })

    return () => {
      cancelAnimationFrame(rafId1)
      if (rafId2 !== null) cancelAnimationFrame(rafId2)
      if (timeoutId !== null) clearTimeout(timeoutId)
      detachTerminal(sessionId, container)
    }
  }, [sessionId])

  // Handle resize
  useEffect(() => {
    if (!containerRef.current || !fitAddonRef.current || !terminalRef.current)
      return

    const handleResize = () => {
      if (!fitAddonRef.current || !terminalRef.current) return

      try {
        fitAddonRef.current.fit()
        const { cols, rows } = terminalRef.current
        if (cols > 0 && rows > 0) {
          invoke('resize_terminal', { id: sessionId, cols, rows }).catch(
            console.error,
          )
        }
      } catch (e) {
        // Silently ignore fit errors during resize
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(handleResize)
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [sessionId])

  // Auto-focus when session becomes active, sidebar state changes, or pane focus changes
  useEffect(() => {
    const terminal = terminalRef.current
    if (!terminal) return

    if (isRootActive && isFocusedPane) {
      requestAnimationFrame(() => {
        terminal.focus()
      })
    } else {
      terminal.blur()
    }
  }, [isRootActive, sidebarCollapsed, isFocusedPane])

  // Apply cursor style changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.cursorStyle = cursorStyle
    }
  }, [cursorStyle])

  // Apply cursor blink changes
  useEffect(() => {
    if (terminalRef.current) {
      const shouldBlink = isRootActive && isFocusedPane && cursorBlink
      terminalRef.current.options.cursorBlink = shouldBlink
    }
  }, [cursorBlink, isRootActive, isFocusedPane])

  const handleClick = () => {
    terminalRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="w-full h-full" onClick={handleClick} />
  )
}

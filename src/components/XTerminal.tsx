import { useCallback, useEffect, useRef, useState } from 'react'
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
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<TerminalEntry['fitAddon'] | null>(null)

  const sidebarCollapsed = useSidebarStore((state) => state.collapsed)

  const cursorStyle = useSettingsStore((state) => state.appearance.cursorStyle)
  const cursorBlink = useSettingsStore((state) => state.appearance.cursorBlink)

  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerEl(node)
  }, [])

  // Initialize terminal
  useEffect(() => {
    const container = containerEl
    if (!container) return

    const entry = attachTerminal(sessionId, container)
    terminalRef.current = entry.terminal
    fitAddonRef.current = entry.fitAddon
    if (isRootActive && isFocusedPane) {
      requestAnimationFrame(() => {
        entry.terminal.focus()
      })
    }

    const doFit = () => {
      if (!fitAddonRef.current || !terminalRef.current || !containerEl) return

      // Check if container has valid dimensions before fitting
      const rect = containerEl.getBoundingClientRect()
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
  }, [sessionId, containerEl])

  // Handle resize
  useEffect(() => {
    if (!containerEl || !fitAddonRef.current || !terminalRef.current) return

    let lastCols = 0
    let lastRows = 0
    let settleTimeoutId: number | null = null

    const fitAndMaybeResize = (shouldInvoke: boolean) => {
      if (!fitAddonRef.current || !terminalRef.current || !containerEl) return

      const rect = containerEl.getBoundingClientRect()
      if (rect.width < 10 || rect.height < 10) return

      try {
        fitAddonRef.current.fit()
        if (!shouldInvoke) return

        const { cols, rows } = terminalRef.current
        if (cols > 0 && rows > 0 && (cols !== lastCols || rows !== lastRows)) {
          lastCols = cols
          lastRows = rows
          invoke('resize_terminal', { id: sessionId, cols, rows }).catch(
            console.error,
          )
        }
      } catch (e) {
        // Silently ignore fit errors during resize
      }
    }

    const handleResize = () => {
      // Clear previous settle timer
      if (settleTimeoutId !== null) {
        clearTimeout(settleTimeoutId)
      }

      // Fit immediately for responsive layout
      fitAndMaybeResize(false)

      // Settle: only invoke backend resize after resize stops
      settleTimeoutId = setTimeout(() => {
        fitAndMaybeResize(true)
        if (isRootActive && isFocusedPane) {
          requestAnimationFrame(() => {
            terminalRef.current?.focus()
          })
        }
      }, 200)
    }

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(handleResize)
    })

    resizeObserver.observe(containerEl)

    return () => {
      resizeObserver.disconnect()
      if (settleTimeoutId !== null) clearTimeout(settleTimeoutId)
    }
  }, [sessionId, containerEl, isRootActive, isFocusedPane])

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
    <div
      ref={setContainerRef}
      className="w-full h-full"
      onClick={handleClick}
    />
  )
}

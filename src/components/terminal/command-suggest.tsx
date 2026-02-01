import { useEffect, useMemo, useRef, useState } from "react";
import type { Terminal } from "@xterm/xterm";

interface CommandSuggestProps {
  terminal: Terminal | null;
  container: HTMLDivElement | null;
  wrapper: HTMLDivElement | null;
  input: string;
  suggestions: string[];
  popupOpen: boolean;
  selectedIndex: number;
}

interface CursorPosition {
  left: number;
  top: number;
  lineHeight: number;
  maxWidth: number;
  fontSize: number;
  fontFamily: string;
}

function getCursorPosition(
  terminal: Terminal,
  container: HTMLDivElement,
  wrapper: HTMLDivElement | null,
): CursorPosition | null {
  const element = terminal.element;
  if (!element) return null;

  const screen = element.querySelector(".xterm-screen") as HTMLElement | null;
  const rows = element.querySelector(".xterm-rows") as HTMLElement | null;
  const screenRect = (screen ?? element).getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const wrapperRect = wrapper?.getBoundingClientRect() ?? containerRect;
  const cursorX = terminal.buffer.active.cursorX;
  const cursorY = terminal.buffer.active.cursorY;

  const core = (terminal as unknown as { _core?: any })._core;
  const dimensions = core?._renderService?.dimensions;
  const cssCellWidth = dimensions?.css?.cell?.width;
  const cssCellHeight = dimensions?.css?.cell?.height;

  const rowEl = rows?.children.item(cursorY) as HTMLElement | null;
  if (rowEl && (cssCellWidth || cssCellHeight)) {
    const rowRect = rowEl.getBoundingClientRect();
    const computedCellWidth =
      cssCellWidth ??
      dimensions?.actualCellWidth ??
      (rowRect.width > 0 ? rowRect.width / terminal.cols : 0);
    const cellWidth =
      computedCellWidth || Math.max(7, Math.round(Number(terminal.options.fontSize ?? 14) * 0.6));
    const lineHeight =
      cssCellHeight ||
      rowRect.height ||
      dimensions?.actualCellHeight ||
      Number(terminal.options.lineHeight ?? 1.4) * 14;
    const left = screenRect.left - wrapperRect.left + cursorX * cellWidth;
    const top = screenRect.top - wrapperRect.top + cursorY * lineHeight;
    return {
      left,
      top,
      lineHeight,
      maxWidth: Math.max(0, screenRect.width - cursorX * cellWidth),
      fontSize: Number(terminal.options.fontSize ?? 14),
      fontFamily: String(terminal.options.fontFamily ?? "JetBrains Mono"),
    };
  }

  const cellWidth = cssCellWidth ?? dimensions?.actualCellWidth;
  const cellHeight = cssCellHeight ?? dimensions?.actualCellHeight;
  if (!cellWidth || !cellHeight) {
    const fontSize = Number(terminal.options.fontSize ?? 14);
    const lineHeight = Number(terminal.options.lineHeight ?? 1.4) * fontSize;
    const fallbackCellWidth = Math.max(7, Math.round(fontSize * 0.6));
    const left = screenRect.left - wrapperRect.left + cursorX * fallbackCellWidth;
    const top = screenRect.top - wrapperRect.top + cursorY * lineHeight;
    return {
      left,
      top,
      lineHeight,
      maxWidth: Math.max(0, screenRect.width - cursorX * fallbackCellWidth),
      fontSize,
      fontFamily: String(terminal.options.fontFamily ?? "JetBrains Mono"),
    };
  }

  const left = screenRect.left - wrapperRect.left + cursorX * cellWidth;
  const top = screenRect.top - wrapperRect.top + cursorY * cellHeight;

  return {
    left,
    top,
    lineHeight: cellHeight,
    maxWidth: Math.max(0, screenRect.width - cursorX * cellWidth),
    fontSize: Number(terminal.options.fontSize ?? 14),
    fontFamily: String(terminal.options.fontFamily ?? "JetBrains Mono"),
  };
}

export default function CommandSuggest({
  terminal,
  container,
  wrapper,
  input,
  suggestions,
  popupOpen,
  selectedIndex,
}: CommandSuggestProps) {
  const ghostSuffix = useMemo(() => {
    if (popupOpen || suggestions.length === 0 || input.length === 0) return "";
    const suggestion = suggestions[0];
    if (!suggestion.startsWith(input)) return "";
    return suggestion.slice(input.length);
  }, [input, popupOpen, suggestions]);

  const [cursorPos, setCursorPos] = useState<CursorPosition | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (!terminal || !container) {
      setCursorPos(null);
      return;
    }
    const updatePosition = () => {
      setCursorPos(getCursorPosition(terminal, container, wrapper));
    };
    updatePosition();
    const rafId = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(rafId);
  }, [terminal, container, wrapper, input, popupOpen, selectedIndex, suggestions.length]);

  useEffect(() => {
    if (!popupOpen) return;
    const target = itemRefs.current[selectedIndex];
    if (target) {
      target.scrollIntoView({ block: "nearest" });
    }
  }, [popupOpen, selectedIndex, suggestions.length]);

  if (!cursorPos) return null;

  const showPopup = popupOpen && suggestions.length > 0;
  const showGhost = ghostSuffix.length > 0;
  if (!showPopup && !showGhost) return null;

  const maxVisible = 6;
  const visibleCount = Math.min(maxVisible, suggestions.length);
  const itemHeight = Math.max(22, Math.round(cursorPos.lineHeight * 0.9));
  const popupPadding = 8;
  const popupHeight = visibleCount * itemHeight + popupPadding;
  const isLowerHalf = cursorPos.top > (container?.clientHeight ?? 0) / 2;
  const popupTop = isLowerHalf
    ? cursorPos.top - popupHeight - 6
    : cursorPos.top + cursorPos.lineHeight + 6;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {showGhost ? (
        <span
          className="absolute whitespace-pre text-[hsl(var(--text-muted))]"
          style={{
            left: cursorPos.left,
            top: cursorPos.top + 2,
            maxWidth: cursorPos.maxWidth,
            fontSize: cursorPos.fontSize,
            fontFamily: cursorPos.fontFamily,
            lineHeight: `${cursorPos.lineHeight}px`,
          }}
        >
          {ghostSuffix}
        </span>
      ) : null}
      {showPopup ? (
        <div
          className="absolute min-w-[240px] rounded-md border border-border/60 bg-[hsl(var(--bg-card))] shadow-lg pointer-events-auto"
          style={{
            left: cursorPos.left,
            top: popupTop,
            maxWidth: Math.max(240, cursorPos.maxWidth),
            fontSize: cursorPos.fontSize,
            fontFamily: cursorPos.fontFamily,
          }}
        >
          <div
            ref={listRef}
            className="overflow-y-auto py-1"
            style={{ maxHeight: maxVisible * itemHeight + popupPadding }}
          >
            {suggestions.map((item, index) => {
              const isActive = index === selectedIndex;
              return (
                <div
                  key={`${item}-${index}`}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  className={`px-3 text-sm text-[hsl(var(--text-primary))] ${
                    isActive ? "bg-[hsl(var(--bg-hover))]" : ""
                  }`}
                  style={{ height: itemHeight, lineHeight: `${itemHeight}px` }}
                >
                  <div className="truncate">{item}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

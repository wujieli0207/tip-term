export {
  attachTerminal,
  detachTerminal,
  setTerminalActive,
  cleanupTerminals,
  updateTerminalThemes,
  updateTerminalCursorSettings,
  updateTerminalFontSettings,
  updateTerminalConfig,
  searchTerminal,
  searchNext,
  searchPrevious,
  clearSearch,
  serializeTerminal,
  restoreTerminal,
} from "../terminalRegistry";

export type { TerminalEntry, SearchOptions } from "../terminalRegistry";

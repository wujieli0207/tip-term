export type CursorShape = "block" | "underline" | "bar";
export type BellMode = "off" | "sound" | "visual" | "both";
export type WebLinksActivationKey = "ctrl" | "alt" | "meta" | "shift" | null;
export type MacOptionSelectionMode = "force" | "selection";

export interface TerminalModifierKeys {
  altIsMeta: boolean;
  cmdIsMeta: boolean;
}

export interface TerminalConfig {
  fontFamily: string;
  fontSize: number;
  fontWeight: number | "normal" | "bold";
  fontWeightBold: number | "normal" | "bold";
  lineHeight: number;
  letterSpacing: number;
  padding: string;
  scrollback: number;

  cursorShape: CursorShape;
  cursorBlink: boolean;
  cursorColor: string;
  cursorAccentColor?: string;

  foregroundColor: string;
  backgroundColor: string;
  selectionColor: string;
  colors: string[]; // 16 ANSI colors

  webGLRenderer: boolean;
  ligatures: boolean;
  imageSupport: boolean;
  screenReaderMode: boolean;

  quickEdit: boolean;
  copyOnSelect: boolean;
  bell: BellMode;
  bellSound?: string | null;
  bellSoundURL?: string | null;

  webLinksActivationKey: WebLinksActivationKey;
  modifierKeys: TerminalModifierKeys;
  macOptionSelectionMode: MacOptionSelectionMode;

  shell: string;
  shellArgs: string[];
  workingDirectory?: string | null;
}

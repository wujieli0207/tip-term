/**
 * Terminal color scheme definition
 * Compatible with xterm.js theme format
 */
export interface TerminalColorScheme {
  /** Display name of the color scheme */
  name: string;
  /** Unique identifier */
  id: string;
  /** Whether this is a light or dark theme */
  mode: 'light' | 'dark';
  /** Foreground text color */
  foreground: string;
  /** Background color */
  background: string;
  /** Cursor color */
  cursor: string;
  /** Cursor accent color (behind the cursor) */
  cursorAccent?: string;
  /** Selection background color */
  selectionBackground?: string;
  /** 16 ANSI colors: black, red, green, yellow, blue, magenta, cyan, white, brightBlack, brightRed, brightGreen, brightYellow, brightBlue, brightMagenta, brightCyan, brightWhite */
  colors: string[];
}

/**
 * Theme mode for the application UI
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Convert TerminalColorScheme to xterm.js theme format
 */
export function toXtermTheme(scheme: TerminalColorScheme): {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent?: string;
  selectionBackground?: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
} {
  const [black, red, green, yellow, blue, magenta, cyan, white, brightBlack, brightRed, brightGreen, brightYellow, brightBlue, brightMagenta, brightCyan, brightWhite] = scheme.colors;

  return {
    background: scheme.background,
    foreground: scheme.foreground,
    cursor: scheme.cursor,
    cursorAccent: scheme.cursorAccent,
    selectionBackground: scheme.selectionBackground,
    black,
    red,
    green,
    yellow,
    blue,
    magenta,
    cyan,
    white,
    brightBlack,
    brightRed,
    brightGreen,
    brightYellow,
    brightBlue,
    brightMagenta,
    brightCyan,
    brightWhite,
  };
}

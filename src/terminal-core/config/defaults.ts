import { getThemeService } from "../../services/themeService";
import type { TerminalConfig } from "./schema";

function buildThemeDefaults() {
  const scheme = getThemeService().getActiveColorScheme();
  const colors = scheme.colors;
  const theme = getThemeService().getTerminalTheme();

  return {
    colors: colors.length === 16 ? colors : [
      theme.black,
      theme.red,
      theme.green,
      theme.yellow,
      theme.blue,
      theme.magenta,
      theme.cyan,
      theme.white,
      theme.brightBlack,
      theme.brightRed,
      theme.brightGreen,
      theme.brightYellow,
      theme.brightBlue,
      theme.brightMagenta,
      theme.brightCyan,
      theme.brightWhite,
    ],
    foregroundColor: theme.foreground,
    backgroundColor: theme.background,
    cursorColor: theme.cursor,
    cursorAccentColor: theme.cursorAccent,
    selectionColor: theme.selectionBackground ?? "rgba(255,255,255,0.3)",
  };
}

export function buildDefaultTerminalConfig(): TerminalConfig {
  const themeDefaults = buildThemeDefaults();

  return {
    fontFamily: "JetBrains Mono",
    fontSize: 14,
    fontWeight: 400,
    fontWeightBold: 700,
    lineHeight: 1.4,
    letterSpacing: 0,
    padding: "0px",
    scrollback: 10000,

    cursorShape: "block",
    cursorBlink: true,
    cursorColor: themeDefaults.cursorColor,
    cursorAccentColor: themeDefaults.cursorAccentColor,

    foregroundColor: themeDefaults.foregroundColor,
    backgroundColor: themeDefaults.backgroundColor,
    selectionColor: themeDefaults.selectionColor,
    colors: themeDefaults.colors,

    webGLRenderer: true,
    ligatures: true,
    imageSupport: true,
    screenReaderMode: false,

    quickEdit: false,
    copyOnSelect: false,
    bell: "off",
    bellSound: null,
    bellSoundURL: null,

    webLinksActivationKey: "meta",
    modifierKeys: {
      altIsMeta: false,
      cmdIsMeta: true,
    },
    macOptionSelectionMode: "selection",

    shell: "/bin/zsh",
    shellArgs: [],
    workingDirectory: null,
  };
}

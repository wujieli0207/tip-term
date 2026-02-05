import { Terminal, type IDisposable } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { CanvasAddon } from "@xterm/addon-canvas";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { SerializeAddon } from "@xterm/addon-serialize";
import type { ImageAddon } from "@xterm/addon-image";
import type { LigaturesAddon } from "@xterm/addon-ligatures";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import { useTerminalSuggestStore } from "../stores/terminalSuggestStore";
import { useTerminalSearchStore } from "../stores/terminalSearchStore";
import { sendNotification } from "../utils/notifications";
import { getThemeService } from "../services/themeService";
import { useTerminalConfigStore } from "../stores/terminalConfigStore";
import type { TerminalConfig } from "./config/schema";
import { TerminalOutputBatcher } from "./session/ioBatcher";

const getSessionStore = () => import("../stores/sessionStore").then(m => m.useSessionStore.getState());
const getEditorStore = () => import("../stores/editorStore").then(m => m.useEditorStore.getState());

const ACTIVITY_NOTIFICATION_COOLDOWN = 5000;
const SUGGEST_DEBOUNCE_MS = 150;
const SUGGEST_LIMIT = 40;

const isWebgl2Supported = (() => {
  let isSupported: boolean | undefined;
  return () => {
    if (isSupported === undefined) {
      try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl2", { depth: false, antialias: false });
        isSupported = gl instanceof WebGL2RenderingContext;
        if (gl) {
          const ext = gl.getExtension("WEBGL_lose_context");
          ext?.loseContext();
        }
      } catch {
        isSupported = false;
      }
    }
    return isSupported;
  };
})();

export interface TerminalEntry {
  terminal: Terminal;
  fitAddon: FitAddon;
  webglAddon?: WebglAddon;
  canvasAddon?: CanvasAddon;
  webLinksAddon?: WebLinksAddon;
  searchAddon: SearchAddon;
  unicode11Addon?: Unicode11Addon;
  serializeAddon?: SerializeAddon;
  imageAddon?: ImageAddon;
  ligaturesAddon?: LigaturesAddon;
  rendererType: "webgl" | "canvas" | "dom";
  isOpened: boolean;
  container?: HTMLElement;
  dataDisposable?: IDisposable;
  titleDisposable?: IDisposable;
  bellDisposable?: IDisposable;
  searchResultsDisposable?: IDisposable;
  unlisten?: () => void;
  unlistenPromise?: Promise<() => void>;
  lastActivityNotificationAt: number;
  isDisposed: boolean;
  inputBuffer: string;
  suggestLastPrefix: string;
  suggestFetchTimeout?: number | null;
  outputBatcher: TerminalOutputBatcher;
  bellAudio?: HTMLAudioElement | null;
}

const registry = new Map<string, TerminalEntry>();

function getTerminalConfigSnapshot(): TerminalConfig {
  return useTerminalConfigStore.getState().config;
}

function isTransparentColor(color: string): boolean {
  const rgbaMatch = color.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([0-9.]+)\s*\)/i);
  if (rgbaMatch) {
    return Number(rgbaMatch[1]) < 1;
  }
  const hexMatch = color.match(/^#([0-9a-f]{8})$/i);
  if (hexMatch) {
    const alphaHex = hexMatch[1].slice(6, 8);
    return parseInt(alphaHex, 16) < 255;
  }
  return false;
}

function buildThemeFromConfig(config: TerminalConfig) {
  if (Array.isArray(config.colors) && config.colors.length === 16) {
    const [
      black, red, green, yellow, blue, magenta, cyan, white,
      brightBlack, brightRed, brightGreen, brightYellow, brightBlue, brightMagenta, brightCyan, brightWhite,
    ] = config.colors;

    return {
      background: config.backgroundColor,
      foreground: config.foregroundColor,
      cursor: config.cursorColor,
      cursorAccent: config.cursorAccentColor,
      selectionBackground: config.selectionColor,
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

  return getThemeService().getTerminalTheme();
}

function isWebLinksActivationKeyPressed(event: MouseEvent): boolean {
  const key = getTerminalConfigSnapshot().webLinksActivationKey;
  if (key === null) return false;
  switch (key) {
    case "ctrl":
      return event.ctrlKey;
    case "meta":
      return event.metaKey;
    case "alt":
      return event.altKey;
    case "shift":
      return event.shiftKey;
    default:
      return false;
  }
}

function createBellAudio(config: TerminalConfig): HTMLAudioElement | null {
  if (config.bellSoundURL) {
    return new Audio(config.bellSoundURL);
  }
  if (config.bellSound) {
    return new Audio(config.bellSound);
  }
  return null;
}

function createEntry(sessionId: string): TerminalEntry {
  const config = getTerminalConfigSnapshot();
  const theme = buildThemeFromConfig(config);
  const allowTransparency = isTransparentColor(config.backgroundColor);

  const terminal = new Terminal({
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    fontWeight: config.fontWeight,
    fontWeightBold: config.fontWeightBold,
    lineHeight: config.lineHeight,
    letterSpacing: config.letterSpacing,
    scrollback: config.scrollback,
    cursorStyle: config.cursorShape,
    cursorBlink: config.cursorBlink,
    allowTransparency,
    macOptionIsMeta: config.modifierKeys.altIsMeta,
    macOptionClickForcesSelection: config.macOptionSelectionMode === "force",
    theme,
    screenReaderMode: config.screenReaderMode,
    allowProposedApi: true,
  });

  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);

  const searchAddon = new SearchAddon();
  terminal.loadAddon(searchAddon);

  let unicode11Addon: Unicode11Addon | undefined;
  try {
    unicode11Addon = new Unicode11Addon();
    terminal.loadAddon(unicode11Addon);
    terminal.unicode.activeVersion = "11";
  } catch (e) {
    console.warn("[terminalRegistry] Unicode11Addon failed to load:", e);
  }

  let serializeAddon: SerializeAddon | undefined;
  try {
    serializeAddon = new SerializeAddon();
    terminal.loadAddon(serializeAddon);
  } catch (e) {
    console.warn("[terminalRegistry] SerializeAddon failed to load:", e);
  }

  let imageAddon: ImageAddon | undefined;

  const webLinksAddon = new WebLinksAddon((event, uri) => {
    if (!isWebLinksActivationKeyPressed(event)) return;
    open(uri).catch((err) => {
      console.error("[terminalRegistry] Failed to open URL:", err);
    });
  });
  terminal.loadAddon(webLinksAddon);

  const filePathRegex = /(?:^|\s)((?:\.{0,2}\/)?(?:[\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\-]+\/)*[\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\-.]+\.[a-zA-Z0-9]+(?::\d+(?::\d+)?)?)/gu;

  terminal.registerLinkProvider({
    provideLinks: (bufferLineNumber, callback) => {
      const line = terminal.buffer.active.getLine(bufferLineNumber - 1);
      if (!line) {
        callback(undefined);
        return;
      }

      const lineText = line.translateToString();
      const links: Array<{
        range: { start: { x: number; y: number }; end: { x: number; y: number } };
        text: string;
        activate: (event: MouseEvent) => void | Promise<void>;
      }> = [];

      let match;
      filePathRegex.lastIndex = 0;
      while ((match = filePathRegex.exec(lineText)) !== null) {
        const filePath = match[1];
        if (filePath.includes('://')) continue;

        const matchStart = match.index + (match[0].length - match[1].length);
        const startX = matchStart + 1;
        const endX = matchStart + filePath.length;

        links.push({
          range: {
            start: { x: startX, y: bufferLineNumber },
            end: { x: endX, y: bufferLineNumber },
          },
          text: filePath,
          activate: async (event: MouseEvent) => {
            if (!isWebLinksActivationKeyPressed(event)) return;
            const pathMatch = filePath.match(/^(.+?)(?::(\d+)(?::(\d+))?)?$/);
            if (!pathMatch) return;

            let path = pathMatch[1];

            if (!path.startsWith('/')) {
              const sessionStore = await getSessionStore();
              const session = sessionStore.sessions.get(sessionId);
              const cwd = session?.cwd;
              if (cwd) {
                if (path.startsWith('./')) {
                  path = `${cwd}/${path.slice(2)}`;
                } else if (path.startsWith('../')) {
                  const parentDir = cwd.split('/').slice(0, -1).join('/');
                  path = `${parentDir}/${path.slice(3)}`;
                } else {
                  path = `${cwd}/${path}`;
                }
              } else {
                console.warn("[terminalRegistry] Cannot resolve relative path: no cwd available for session", sessionId);
                return;
              }
            }

            const editorStore = await getEditorStore();
            editorStore.openFile(path).catch((err: unknown) => {
              console.error("[terminalRegistry] Failed to open file in editor:", err, path);
            });
          },
        });
      }

      callback(links.length > 0 ? links : undefined);
    },
  });

  let webglAddon: WebglAddon | undefined;
  let canvasAddon: CanvasAddon | undefined;
  let rendererType: "webgl" | "canvas" | "dom" = "dom";

  const useWebGL = config.webGLRenderer && isWebgl2Supported() && !allowTransparency;

  if (useWebGL) {
    try {
      webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        console.warn(`[terminalRegistry] WebGL context lost for session ${sessionId}, falling back to canvas renderer`);
        webglAddon?.dispose();
        webglAddon = undefined;
        try {
          canvasAddon = new CanvasAddon();
          terminal.loadAddon(canvasAddon);
          rendererType = "canvas";
          const entry = registry.get(sessionId);
          if (entry) {
            entry.webglAddon = undefined;
            entry.canvasAddon = canvasAddon;
            entry.rendererType = "canvas";
          }
        } catch (canvasError) {
          console.warn("[terminalRegistry] Canvas addon failed to load after WebGL context loss:", canvasError);
          rendererType = "dom";
          const entry = registry.get(sessionId);
          if (entry) {
            entry.rendererType = "dom";
          }
        }
      });
      terminal.loadAddon(webglAddon);
      rendererType = "webgl";
    } catch (e) {
      console.warn("[terminalRegistry] WebGL addon failed to load, trying canvas renderer:", e);
      webglAddon = undefined;
    }
  }

  if (!webglAddon) {
    try {
      canvasAddon = new CanvasAddon();
      terminal.loadAddon(canvasAddon);
      rendererType = "canvas";
    } catch (e) {
      console.warn("[terminalRegistry] Canvas addon failed to load, using DOM renderer:", e);
      canvasAddon = undefined;
      rendererType = "dom";
    }
  }

  let ligaturesAddon: LigaturesAddon | undefined;

  const entry: TerminalEntry = {
    terminal,
    fitAddon,
    webglAddon,
    canvasAddon,
    webLinksAddon,
    searchAddon,
    unicode11Addon,
    serializeAddon,
    imageAddon,
    ligaturesAddon,
    rendererType,
    isOpened: false,
    lastActivityNotificationAt: 0,
    isDisposed: false,
    inputBuffer: "",
    suggestLastPrefix: "",
    suggestFetchTimeout: null,
    outputBatcher: new TerminalOutputBatcher((data) => terminal.write(data)),
    bellAudio: createBellAudio(config),
  };

  useTerminalSuggestStore.getState().ensureSession(sessionId);

  const clearSuggestState = () => {
    const suggestStore = useTerminalSuggestStore.getState();
    suggestStore.setSuggestions(sessionId, []);
    suggestStore.closePopup(sessionId);
    entry.suggestLastPrefix = "";
  };

  const scheduleSuggestFetch = (prefix: string, forcePopup: boolean) => {
    const suggestStore = useTerminalSuggestStore.getState();
    if (forcePopup) {
      suggestStore.openPopup(sessionId);
    }

    if (entry.suggestFetchTimeout) {
      clearTimeout(entry.suggestFetchTimeout);
    }

    entry.suggestFetchTimeout = setTimeout(() => {
      entry.suggestFetchTimeout = null;
      if (!forcePopup && prefix === entry.suggestLastPrefix) return;
      entry.suggestLastPrefix = prefix;

      invoke<string[]>("get_shell_history", { prefix, limit: SUGGEST_LIMIT })
        .then((suggestions) => {
          suggestStore.setSuggestions(sessionId, suggestions);
        })
        .catch(() => {
          suggestStore.setSuggestions(sessionId, []);
        });
    }, SUGGEST_DEBOUNCE_MS) as unknown as number;
  };

  const updateInputBuffer = (data: string) => {
    const suggestStore = useTerminalSuggestStore.getState();
    for (const char of data) {
      if (char === "\r" || char === "\n") {
        entry.inputBuffer = "";
        clearSuggestState();
        continue;
      }
      if (char === "\u007f") {
        entry.inputBuffer = entry.inputBuffer.slice(0, -1);
        continue;
      }
      if (char === "\u0015") {
        entry.inputBuffer = "";
        continue;
      }
      if (char === "\u0017") {
        entry.inputBuffer = entry.inputBuffer.replace(/\s+\S*$/, "");
        continue;
      }
      if (char >= " " && char !== "\u007f") {
        entry.inputBuffer += char;
      }
    }

    suggestStore.setInput(sessionId, entry.inputBuffer);

    const popupOpen = suggestStore.entries.get(sessionId)?.popupOpen ?? false;
    const prefix = entry.inputBuffer;
    if (prefix.length === 0 && !popupOpen) {
      clearSuggestState();
      return;
    }

    scheduleSuggestFetch(prefix, false);
  };

  const acceptSuggestion = (selected?: string) => {
    const suggestStore = useTerminalSuggestStore.getState();
    const entryState = suggestStore.entries.get(sessionId);
    if (!entryState || entryState.suggestions.length === 0) return;

    const suggestion =
      selected ?? entryState.suggestions[entryState.selectedIndex] ?? entryState.suggestions[0];
    if (!suggestion) return;

    if (suggestion === entry.inputBuffer) return;
    if (!suggestion.startsWith(entry.inputBuffer)) return;

    const remainder = suggestion.slice(entry.inputBuffer.length);
    if (!remainder) return;

    entry.inputBuffer = suggestion;
    suggestStore.setInput(sessionId, entry.inputBuffer);
    suggestStore.closePopup(sessionId);
    invoke("write_to_session", { id: sessionId, data: remainder }).catch(console.error);
  };

  terminal.attachCustomKeyEventHandler((event) => {
    if (event.type !== "keydown") return true;

    const suggestStore = useTerminalSuggestStore.getState();
    const entryState = suggestStore.entries.get(sessionId);
    const popupOpen = entryState?.popupOpen ?? false;
    const suggestions = entryState?.suggestions ?? [];

    if (event.key === "Tab" && suggestions.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      acceptSuggestion();
      return false;
    }

    if (event.key === "ArrowUp" && popupOpen) {
      event.preventDefault();
      event.stopPropagation();
      suggestStore.moveSelection(sessionId, "up");
      return false;
    }

    if (event.key === "ArrowDown" && popupOpen) {
      event.preventDefault();
      event.stopPropagation();
      suggestStore.moveSelection(sessionId, "down");
      return false;
    }

    if (event.key === "Enter" && popupOpen && suggestions.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      acceptSuggestion();
      return false;
    }

    if (event.key === "Escape" && popupOpen) {
      event.preventDefault();
      event.stopPropagation();
      suggestStore.closePopup(sessionId);
      return false;
    }

    return true;
  });

  entry.dataDisposable = terminal.onData((data) => {
    invoke("write_to_session", { id: sessionId, data }).catch(console.error);
    updateInputBuffer(data);
  });

  entry.titleDisposable = terminal.onTitleChange((title) => {
    getSessionStore().then(store => store.updateSessionTerminalTitle(sessionId, title));
  });

  entry.bellDisposable = terminal.onBell(() => {
    const bellSetting = getTerminalConfigSnapshot().bell;
    if (bellSetting === "off") return;

    if (bellSetting === "visual" || bellSetting === "both") {
      const element = terminal.element;
      if (element) {
        element.classList.add("terminal-bell-flash");
        setTimeout(() => {
          element.classList.remove("terminal-bell-flash");
        }, 150);
      }
    }

    if (bellSetting === "sound" || bellSetting === "both") {
      const configSnapshot = getTerminalConfigSnapshot();
      if (configSnapshot.bellSound || configSnapshot.bellSoundURL) {
        entry.bellAudio = entry.bellAudio ?? createBellAudio(configSnapshot);
        entry.bellAudio?.play().catch(() => {
          // ignore audio errors
        });
      } else {
        try {
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 800;
          oscillator.type = "sine";
          gainNode.gain.value = 0.1;
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.1);
        } catch {
          // Audio not available
        }
      }
    }
  });

  entry.searchResultsDisposable = entry.searchAddon.onDidChangeResults((results) => {
    const searchStore = useTerminalSearchStore.getState();
    const current = results?.resultIndex != null ? results.resultIndex + 1 : 0;
    const total = results?.resultCount ?? 0;
    searchStore.setMatchInfo(current, total);
  });

  entry.unlistenPromise = listen<number[]>(`terminal-output-${sessionId}`, async (event) => {
    if (entry.isDisposed) return;
    const data = new Uint8Array(event.payload);
    entry.outputBatcher.push(data);

    const currentState = await getSessionStore();
    const currentSession = currentState.sessions.get(sessionId);
    const isCurrentlyActive = currentState.activeSessionId === sessionId;

    if (currentSession?.notifyOnActivity && !isCurrentlyActive && data.length > 0) {
      const now = Date.now();
      if (now - entry.lastActivityNotificationAt >= ACTIVITY_NOTIFICATION_COOLDOWN) {
        entry.lastActivityNotificationAt = now;
        sendNotification({
          title: "Terminal Activity",
          body: "New output in session",
          sessionId,
        });
      }
    }
  });

  entry.unlistenPromise.then((unlisten) => {
    entry.unlisten = unlisten;
    if (entry.isDisposed) {
      unlisten();
    }
  });

  return entry;
}

export function getOrCreateTerminal(sessionId: string): TerminalEntry {
  let entry = registry.get(sessionId);
  if (!entry) {
    entry = createEntry(sessionId);
    registry.set(sessionId, entry);
  }
  return entry;
}

export function attachTerminal(sessionId: string, container: HTMLElement): TerminalEntry {
  const entry = getOrCreateTerminal(sessionId);
  const config = getTerminalConfigSnapshot();

  if (entry.container === container) {
    return entry;
  }

  const wasOpened = entry.isOpened;
  if (!entry.isOpened) {
    entry.terminal.open(container);
    entry.isOpened = true;
  } else {
    const element = entry.terminal.element;
    if (element && element.parentElement !== container) {
      container.innerHTML = "";
      container.appendChild(element);
    }
  }

  if (!wasOpened) {
    if (!entry.imageAddon && config.imageSupport) {
      import("@xterm/addon-image").then(({ ImageAddon }) => {
        if (entry.isDisposed) return;
        try {
          const imageAddon = new ImageAddon({
            enableSizeReports: true,
            sixelSupport: true,
            sixelScrolling: true,
            sixelPaletteLimit: 256,
            storageLimit: 128,
            showPlaceholder: true,
          });
          entry.terminal.loadAddon(imageAddon);
          entry.imageAddon = imageAddon;
        } catch (e) {
          console.warn("[terminalRegistry] ImageAddon failed to load:", e);
        }
      }).catch(() => {
        // ignore
      });
    }

    if (!entry.ligaturesAddon && entry.rendererType !== "webgl" && config.ligatures) {
      import("@xterm/addon-ligatures").then(({ LigaturesAddon }) => {
        if (entry.isDisposed) return;
        if (entry.rendererType === "webgl") return;
        try {
          const ligaturesAddon = new LigaturesAddon();
          entry.terminal.loadAddon(ligaturesAddon);
          entry.ligaturesAddon = ligaturesAddon;
        } catch (e) {
          console.debug("[terminalRegistry] LigaturesAddon not loaded (font may not support ligatures):", e);
        }
      }).catch(() => {
        // ignore
      });
    }
  }

  entry.container = container;
  if (config.padding) {
    const element = entry.terminal.element;
    if (element) {
      element.style.padding = config.padding;
    }
  }

  if (import.meta.env.DEV) {
    const element = entry.terminal.element;
    if (element && element.parentElement !== container) {
      console.warn("[terminalRegistry] terminal element not attached", {
        sessionId,
      });
    }
  }
  return entry;
}

export function detachTerminal(sessionId: string, container?: HTMLElement): void {
  const entry = registry.get(sessionId);
  if (!entry) return;
  if (container && entry.container !== container) return;
  if (entry.container) {
    entry.container.innerHTML = "";
    entry.container = undefined;
  }
}

export function disposeTerminal(sessionId: string): void {
  const entry = registry.get(sessionId);
  if (!entry) return;
  entry.isDisposed = true;

  if (entry.suggestFetchTimeout) {
    clearTimeout(entry.suggestFetchTimeout);
    entry.suggestFetchTimeout = null;
  }
  useTerminalSuggestStore.getState().resetSession(sessionId);

  entry.dataDisposable?.dispose();
  entry.titleDisposable?.dispose();
  entry.bellDisposable?.dispose();
  entry.searchResultsDisposable?.dispose();
  entry.webglAddon?.dispose();
  entry.canvasAddon?.dispose();
  entry.webLinksAddon?.dispose();
  entry.searchAddon?.dispose();
  entry.unicode11Addon?.dispose();
  entry.serializeAddon?.dispose();
  entry.imageAddon?.dispose();
  entry.ligaturesAddon?.dispose();
  if (entry.unlisten) {
    entry.unlisten();
  } else if (entry.unlistenPromise) {
    entry.unlistenPromise.then((unlisten) => unlisten());
  }
  entry.terminal.dispose();
  registry.delete(sessionId);
}

export function cleanupTerminals(activeSessionIds: Set<string>): void {
  for (const sessionId of registry.keys()) {
    if (!activeSessionIds.has(sessionId)) {
      disposeTerminal(sessionId);
    }
  }
}

export function updateTerminalThemes(): void {
  const config = getTerminalConfigSnapshot();
  const newTheme = buildThemeFromConfig(config);
  for (const entry of registry.values()) {
    if (!entry.isDisposed) {
      entry.terminal.options.theme = newTheme;
    }
  }
}

export function updateTerminalCursorSettings(): void {
  const config = getTerminalConfigSnapshot();
  for (const entry of registry.values()) {
    if (!entry.isDisposed) {
      entry.terminal.options.cursorBlink = config.cursorBlink;
      entry.terminal.options.cursorStyle = config.cursorShape;
    }
  }
}

export function updateTerminalFontSettings(): void {
  const config = getTerminalConfigSnapshot();
  for (const entry of registry.values()) {
    if (!entry.isDisposed) {
      entry.terminal.options.fontSize = config.fontSize;
      entry.terminal.options.fontFamily = config.fontFamily;
      entry.terminal.options.lineHeight = config.lineHeight;
      try {
        entry.fitAddon.fit();
      } catch {
        // ignore
      }
    }
  }
}

export function updateTerminalConfig(config: TerminalConfig): void {
  const theme = buildThemeFromConfig(config);
  for (const entry of registry.values()) {
    if (entry.isDisposed) continue;
    entry.terminal.options.fontFamily = config.fontFamily;
    entry.terminal.options.fontSize = config.fontSize;
    entry.terminal.options.fontWeight = config.fontWeight;
    entry.terminal.options.fontWeightBold = config.fontWeightBold;
    entry.terminal.options.lineHeight = config.lineHeight;
    entry.terminal.options.letterSpacing = config.letterSpacing;
    entry.terminal.options.scrollback = config.scrollback;
    entry.terminal.options.cursorStyle = config.cursorShape;
    entry.terminal.options.cursorBlink = config.cursorBlink;
    entry.terminal.options.screenReaderMode = config.screenReaderMode;
    entry.terminal.options.macOptionIsMeta = config.modifierKeys.altIsMeta;
    entry.terminal.options.macOptionClickForcesSelection = config.macOptionSelectionMode === "force";
    entry.terminal.options.allowTransparency = isTransparentColor(config.backgroundColor);
    entry.terminal.options.theme = theme;

    const element = entry.terminal.element;
    if (element) {
      element.style.padding = config.padding;
    }

    if (config.imageSupport && !entry.imageAddon && entry.isOpened) {
      import("@xterm/addon-image").then(({ ImageAddon }) => {
        if (entry.isDisposed) return;
        try {
          const imageAddon = new ImageAddon({
            enableSizeReports: true,
            sixelSupport: true,
            sixelScrolling: true,
            sixelPaletteLimit: 256,
            storageLimit: 128,
            showPlaceholder: true,
          });
          entry.terminal.loadAddon(imageAddon);
          entry.imageAddon = imageAddon;
        } catch (e) {
          console.warn("[terminalRegistry] ImageAddon failed to load:", e);
        }
      }).catch(() => {
        // ignore
      });
    }

    if (!config.ligatures && entry.ligaturesAddon) {
      entry.ligaturesAddon.dispose();
      entry.ligaturesAddon = undefined;
    }

    entry.bellAudio = createBellAudio(config);
  }
}

export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
}

function buildSearchOptions({
  caseSensitive = false,
  wholeWord = false,
  regex = false,
}: SearchOptions) {
  return { caseSensitive, wholeWord, regex };
}

function searchDirection(
  sessionId: string,
  query: string,
  direction: "next" | "previous",
  options: SearchOptions = {}
): boolean {
  const entry = registry.get(sessionId);
  if (!entry || entry.isDisposed || !query) return false;

  const searchFn = direction === "next" ? "findNext" : "findPrevious";
  return entry.searchAddon[searchFn](query, buildSearchOptions(options));
}

export function searchTerminal(
  sessionId: string,
  query: string,
  options: SearchOptions = {}
): { found: boolean } {
  const entry = registry.get(sessionId);
  if (!entry || entry.isDisposed || !query) {
    return { found: false };
  }

  const config = getTerminalConfigSnapshot();
  const matchColor = config.selectionColor;
  const activeMatchColor = config.cursorColor;

  const found = entry.searchAddon.findNext(query, {
    ...buildSearchOptions(options),
    decorations: {
      matchBackground: matchColor,
      matchBorder: matchColor,
      matchOverviewRuler: matchColor,
      activeMatchBackground: activeMatchColor,
      activeMatchBorder: activeMatchColor,
      activeMatchColorOverviewRuler: activeMatchColor,
    },
  });

  return { found };
}

export function searchNext(
  sessionId: string,
  query: string,
  options: SearchOptions = {}
): boolean {
  return searchDirection(sessionId, query, "next", options);
}

export function searchPrevious(
  sessionId: string,
  query: string,
  options: SearchOptions = {}
): boolean {
  return searchDirection(sessionId, query, "previous", options);
}

export function clearSearch(sessionId: string): void {
  const entry = registry.get(sessionId);
  if (!entry || entry.isDisposed) return;
  entry.searchAddon.clearDecorations();
}

export function serializeTerminal(sessionId: string): string | null {
  const entry = registry.get(sessionId);
  if (!entry || entry.isDisposed || !entry.serializeAddon) {
    return null;
  }

  try {
    return entry.serializeAddon.serialize();
  } catch (e) {
    console.warn("[terminalRegistry] Failed to serialize terminal:", e);
    return null;
  }
}

export function restoreTerminal(sessionId: string, data: string): boolean {
  const entry = registry.get(sessionId);
  if (!entry || entry.isDisposed || !data) {
    return false;
  }

  try {
    entry.terminal.write(data);
    return true;
  } catch (e) {
    console.warn("[terminalRegistry] Failed to restore terminal:", e);
    return false;
  }
}

export function setTerminalActive(sessionId: string, isActive: boolean): void {
  const entry = registry.get(sessionId);
  if (!entry || entry.isDisposed) return;
  entry.terminal.options.disableStdin = !isActive;
  if (!isActive) {
    entry.terminal.blur();
  }
}

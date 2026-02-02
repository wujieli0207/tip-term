import { create } from "zustand";
import { persist } from "zustand/middleware";
import { HotkeyBinding, HotkeyCustomization } from "../types/hotkey";
import type { ThemeMode } from "../types/theme";

export interface AppearanceSettings {
  cursorStyle: "block" | "underline" | "bar";
  cursorBlink: boolean;
  themeMode: ThemeMode;
  darkColorScheme: string;
  lightColorScheme: string;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
}

export interface TerminalSettings {
  /** Enable WebGL renderer (falls back to Canvas if unavailable) */
  webGLRenderer: boolean;
  /** Enable font ligatures (only works with Canvas renderer) */
  ligatures: boolean;
  /** Right-click quick copy/paste: if text selected, copy; otherwise paste */
  quickEdit: boolean;
  /** Automatically copy selected text to clipboard */
  copyOnSelect: boolean;
  /** Key modifier required to activate web links (null = disabled) */
  webLinksActivationKey: "ctrl" | "meta" | "alt" | "shift" | null;
  /** Bell notification behavior */
  bell: "off" | "sound" | "visual" | "both";
}

export interface HotkeySettings {
  customizations: HotkeyCustomization;
}

interface SettingsState {
  appearance: AppearanceSettings;
  terminal: TerminalSettings;
  hotkeys: HotkeySettings;
  setCursorStyle: (style: "block" | "underline" | "bar") => void;
  setCursorBlink: (enabled: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setDarkColorScheme: (schemeId: string) => void;
  setLightColorScheme: (schemeId: string) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setLineHeight: (height: number) => void;
  setTerminalSetting: <K extends keyof TerminalSettings>(
    key: K,
    value: TerminalSettings[K]
  ) => void;
  setHotkeyBinding: (id: string, binding: HotkeyBinding | null) => void;
  clearHotkeyBinding: (id: string) => void;
  resetHotkey: (id: string) => void;
  resetAllHotkeys: () => void;
  resetSettings: () => void;
}

const defaultAppearance: AppearanceSettings = {
  cursorStyle: "block",
  cursorBlink: true,
  themeMode: "dark",
  darkColorScheme: "tabby-dark",
  lightColorScheme: "tabby-light",
  fontSize: 14,
  fontFamily: "JetBrains Mono",
  lineHeight: 1.4,
};

const defaultTerminal: TerminalSettings = {
  webGLRenderer: true,
  ligatures: true,
  quickEdit: false,
  copyOnSelect: false,
  webLinksActivationKey: "meta", // Cmd on macOS, Ctrl on other platforms
  bell: "off",
};

const defaultHotkeys: HotkeySettings = {
  customizations: {},
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: defaultAppearance,
      terminal: defaultTerminal,
      hotkeys: defaultHotkeys,

      setCursorStyle: (style) =>
        set((state) => ({
          appearance: { ...state.appearance, cursorStyle: style },
        })),

      setCursorBlink: (enabled) =>
        set((state) => ({
          appearance: { ...state.appearance, cursorBlink: enabled },
        })),

      setThemeMode: (mode) =>
        set((state) => ({
          appearance: { ...state.appearance, themeMode: mode },
        })),

      setDarkColorScheme: (schemeId) =>
        set((state) => ({
          appearance: { ...state.appearance, darkColorScheme: schemeId },
        })),

      setLightColorScheme: (schemeId) =>
        set((state) => ({
          appearance: { ...state.appearance, lightColorScheme: schemeId },
        })),

      setFontSize: (size) =>
        set((state) => ({
          appearance: { ...state.appearance, fontSize: size },
        })),

      setFontFamily: (family) =>
        set((state) => ({
          appearance: { ...state.appearance, fontFamily: family },
        })),

      setLineHeight: (height) =>
        set((state) => ({
          appearance: { ...state.appearance, lineHeight: height },
        })),

      setTerminalSetting: (key, value) =>
        set((state) => ({
          terminal: { ...state.terminal, [key]: value },
        })),

      setHotkeyBinding: (id, binding) =>
        set((state) => ({
          hotkeys: {
            ...state.hotkeys,
            customizations: {
              ...state.hotkeys.customizations,
              [id]: binding,
            },
          },
        })),

      clearHotkeyBinding: (id) =>
        set((state) => ({
          hotkeys: {
            ...state.hotkeys,
            customizations: {
              ...state.hotkeys.customizations,
              [id]: null,
            },
          },
        })),

      resetHotkey: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.hotkeys.customizations;
          return {
            hotkeys: {
              ...state.hotkeys,
              customizations: rest,
            },
          };
        }),

      resetAllHotkeys: () =>
        set((state) => ({
          hotkeys: {
            ...state.hotkeys,
            customizations: {},
          },
        })),

      resetSettings: () =>
        set({
          appearance: defaultAppearance,
          terminal: defaultTerminal,
          hotkeys: defaultHotkeys,
        }),
    }),
    {
      name: "tipterm-settings",
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsState> | undefined;
        return {
          ...currentState,
          ...persisted,
          appearance: {
            ...currentState.appearance,
            ...persisted?.appearance,
          },
          terminal: {
            ...currentState.terminal,
            ...persisted?.terminal,
          },
          hotkeys: {
            ...currentState.hotkeys,
            ...persisted?.hotkeys,
          },
        };
      },
    }
  )
);

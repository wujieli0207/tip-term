import { create } from "zustand";
import { persist } from "zustand/middleware";
import { HotkeyBinding, HotkeyCustomization } from "../types/hotkey";

export interface AppearanceSettings {
  cursorStyle: "block" | "underline" | "bar";
  cursorBlink: boolean;
}

export interface HotkeySettings {
  customizations: HotkeyCustomization;
}

interface SettingsState {
  appearance: AppearanceSettings;
  hotkeys: HotkeySettings;
  setCursorStyle: (style: "block" | "underline" | "bar") => void;
  setCursorBlink: (enabled: boolean) => void;
  setHotkeyBinding: (id: string, binding: HotkeyBinding | null) => void;
  clearHotkeyBinding: (id: string) => void;
  resetHotkey: (id: string) => void;
  resetAllHotkeys: () => void;
  resetSettings: () => void;
}

const defaultAppearance: AppearanceSettings = {
  cursorStyle: "block",
  cursorBlink: true,
};

const defaultHotkeys: HotkeySettings = {
  customizations: {},
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: defaultAppearance,
      hotkeys: defaultHotkeys,

      setCursorStyle: (style) =>
        set((state) => ({
          appearance: { ...state.appearance, cursorStyle: style },
        })),

      setCursorBlink: (enabled) =>
        set((state) => ({
          appearance: { ...state.appearance, cursorBlink: enabled },
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
          hotkeys: defaultHotkeys,
        }),
    }),
    {
      name: "tipterm-settings",
    }
  )
);

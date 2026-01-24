import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AppearanceSettings {
  cursorStyle: "block" | "underline" | "bar";
  cursorBlink: boolean;
}

interface SettingsState {
  appearance: AppearanceSettings;
  setCursorStyle: (style: "block" | "underline" | "bar") => void;
  setCursorBlink: (enabled: boolean) => void;
  resetSettings: () => void;
}

const defaultAppearance: AppearanceSettings = {
  cursorStyle: "block",
  cursorBlink: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: defaultAppearance,

      setCursorStyle: (style) =>
        set((state) => ({
          appearance: { ...state.appearance, cursorStyle: style },
        })),

      setCursorBlink: (enabled) =>
        set((state) => ({
          appearance: { ...state.appearance, cursorBlink: enabled },
        })),

      resetSettings: () =>
        set({
          appearance: defaultAppearance,
        }),
    }),
    {
      name: "tipterm-settings",
    }
  )
);

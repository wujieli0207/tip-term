import { useState } from "react";
import { useSettingsStore } from "../../../stores/settingsStore";
import SettingRow from "../shared/SettingRow";
import RadioGroup from "../shared/RadioGroup";
import { Switch } from "@/components/ui/switch";
import ColorSchemePreview from "../theme/ColorSchemePreview";
import { getColorSchemeById, getColorSchemesByMode, DEFAULT_DARK_SCHEME, DEFAULT_LIGHT_SCHEME } from "../../../config/defaultColorSchemes";
import type { ThemeMode } from "../../../types/theme";
import { updateTerminalThemes } from "../../../utils/terminalRegistry";

const cursorStyleOptions = [
  { value: "block", label: "Block █" },
  { value: "bar", label: "Bar |" },
  { value: "underline", label: "Line _" },
];

const themeModeOptions: { value: ThemeMode; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "auto", label: "Auto (System)" },
];

export default function AppearanceSection() {
  const { appearance, setCursorStyle, setCursorBlink, setThemeMode, setDarkColorScheme, setLightColorScheme } = useSettingsStore();
  const [darkSchemePreview, setDarkSchemePreview] = useState(
    getColorSchemeById(appearance.darkColorScheme) || getColorSchemeById(DEFAULT_DARK_SCHEME)!
  );
  const [lightSchemePreview, setLightSchemePreview] = useState(
    getColorSchemeById(appearance.lightColorScheme) || getColorSchemeById(DEFAULT_LIGHT_SCHEME)!
  );

  const darkSchemes = getColorSchemesByMode('dark');
  const lightSchemes = getColorSchemesByMode('light');

  const handleDarkSchemeChange = (schemeId: string) => {
    setDarkColorScheme(schemeId);
    const scheme = getColorSchemeById(schemeId);
    if (scheme) {
      setDarkSchemePreview(scheme);
      // Update terminal themes immediately if in dark mode
      if (appearance.themeMode === 'dark') {
        updateTerminalThemes();
      }
    }
  };

  const handleLightSchemeChange = (schemeId: string) => {
    setLightColorScheme(schemeId);
    const scheme = getColorSchemeById(schemeId);
    if (scheme) {
      setLightSchemePreview(scheme);
      // Update terminal themes immediately if in light mode
      if (appearance.themeMode === 'light') {
        updateTerminalThemes();
      }
    }
  };

  const handleThemeModeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    // Trigger a theme update to apply the new mode
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('theme-mode-change', { detail: mode }));
    }, 0);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Appearance</h2>

      <div className="space-y-0">
        {/* Theme Mode */}
        <SettingRow
          title="Theme Mode"
          description="Choose the application theme"
        >
          <RadioGroup
            value={appearance.themeMode}
            onChange={(value) => handleThemeModeChange(value as ThemeMode)}
            options={themeModeOptions}
          />
        </SettingRow>

        {/* Dark Color Scheme */}
        <SettingRow
          title="Dark Color Scheme"
          description="Terminal colors for dark mode"
          className="flex-col items-start gap-4"
        >
          <div className="w-full space-y-3">
            <div className="flex flex-wrap gap-2">
              {darkSchemes.map((scheme) => (
                <button
                  key={scheme.id}
                  onClick={() => handleDarkSchemeChange(scheme.id)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    appearance.darkColorScheme === scheme.id
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-active)]'
                  }`}
                >
                  {scheme.name}
                </button>
              ))}
            </div>
            <ColorSchemePreview scheme={darkSchemePreview} />
          </div>
        </SettingRow>

        {/* Light Color Scheme */}
        <SettingRow
          title="Light Color Scheme"
          description="Terminal colors for light mode"
          className="flex-col items-start gap-4"
        >
          <div className="w-full space-y-3">
            <div className="flex flex-wrap gap-2">
              {lightSchemes.map((scheme) => (
                <button
                  key={scheme.id}
                  onClick={() => handleLightSchemeChange(scheme.id)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    appearance.lightColorScheme === scheme.id
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-active)]'
                  }`}
                >
                  {scheme.name}
                </button>
              ))}
            </div>
            <ColorSchemePreview scheme={lightSchemePreview} />
          </div>
        </SettingRow>

        <div className="h-px bg-[var(--border)] my-4" />

        {/* Cursor Style */}
        <SettingRow
          title="Cursor Style"
          description="Choose the cursor shape for the terminal"
        >
          <RadioGroup
            value={appearance.cursorStyle}
            onChange={(value) => setCursorStyle(value as "block" | "underline" | "bar")}
            options={cursorStyleOptions}
          />
        </SettingRow>

        {/* Cursor Blink */}
        <SettingRow
          title="Cursor Blink"
          description="Enable or disable cursor blinking"
        >
          <Switch
            checked={appearance.cursorBlink}
            onCheckedChange={setCursorBlink}
          />
        </SettingRow>
      </div>
    </div>
  );
}

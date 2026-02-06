import { useState, useMemo } from "react";
import { useSettingsStore } from "../../../stores/settingsStore";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import SegmentedControl from "../shared/SegmentedControl";
import Slider from "../shared/Slider";
import FontSelect from "../shared/FontSelect";
import ThemeCard from "../theme/ThemeCard";
import SettingsPageHeader from "../shared/SettingsPageHeader";
import SettingsSection from "../shared/SettingsSection";
import SettingsCard from "../shared/SettingsCard";
import SettingsItem from "../shared/SettingsItem";
import { getColorSchemesByMode } from "../../../config/defaultColorSchemes";
import type { ThemeMode } from "../../../types/theme";
import { updateTerminalThemes } from "../../../terminal-core/api/terminalApi";

const cursorStyleOptions: { value: "block" | "bar" | "underline"; label: React.ReactNode }[] = [
  { value: "block", label: <span className="font-mono">█</span> },
  { value: "bar", label: <span className="font-mono">|</span> },
  { value: "underline", label: <span className="font-mono">─</span> },
];

const themeModeOptions: { value: ThemeMode; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "auto", label: "Auto" },
];

export default function AppearanceSection() {
  const {
    appearance,
    setCursorStyle,
    setCursorBlink,
    setThemeMode,
    setDarkColorScheme,
    setLightColorScheme,
    setFontSize,
    setFontFamily,
    setLineHeight,
  } = useSettingsStore();

  const [searchQuery, setSearchQuery] = useState("");

  // Provide fallback values for settings that may not exist in persisted state
  const fontSize = appearance.fontSize ?? 14;
  const fontFamily = appearance.fontFamily ?? "JetBrains Mono";
  const lineHeight = appearance.lineHeight ?? 1.4;

  const darkSchemes = getColorSchemesByMode("dark");
  const lightSchemes = getColorSchemesByMode("light");

  // Determine which mode to show schemes for (auto follows system preference)
  const effectiveMode = useMemo(() => {
    if (appearance.themeMode === "auto") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return appearance.themeMode;
  }, [appearance.themeMode]);

  const filteredSchemes = useMemo(() => {
    const schemes = effectiveMode === "dark" ? darkSchemes : lightSchemes;
    if (!searchQuery.trim()) return schemes;
    return schemes.filter((scheme) =>
      scheme.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [effectiveMode, searchQuery, darkSchemes, lightSchemes]);

  const currentSchemeId =
    effectiveMode === "dark" ? appearance.darkColorScheme : appearance.lightColorScheme;

  const handleSchemeSelect = (schemeId: string) => {
    if (effectiveMode === "dark") {
      setDarkColorScheme(schemeId);
    } else {
      setLightColorScheme(schemeId);
    }
    // Always update terminal themes since we're selecting for the current effective mode
    updateTerminalThemes();
  };

  const handleThemeModeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("theme-mode-change", { detail: mode }));
    }, 0);
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
  };

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
  };

  const handleLineHeightChange = (height: number) => {
    setLineHeight(height);
  };

  return (
    <div className="space-y-8">
      <SettingsPageHeader
        title="Appearance"
        description="Customize the look and feel of your terminal"
      />

      <SettingsSection title="Basic Styles" description="Configure font and text appearance">
        <SettingsCard>
          <SettingsItem title="Font Family" description="Choose the terminal font">
            <FontSelect value={fontFamily} onChange={handleFontFamilyChange} />
          </SettingsItem>
          <SettingsItem title="Font Size" description="Adjust the terminal text size">
            <Slider
              value={fontSize}
              onChange={handleFontSizeChange}
              min={10}
              max={24}
            />
            <span className="text-sm text-text-secondary w-12 text-right">
              {fontSize}px
            </span>
          </SettingsItem>
          <SettingsItem title="Line Height" description="Spacing between lines">
            <Slider
              value={lineHeight}
              onChange={handleLineHeightChange}
              min={1.0}
              max={2.0}
              step={0.1}
            />
            <span className="text-sm text-text-secondary w-12 text-right">
              {lineHeight.toFixed(1)}
            </span>
          </SettingsItem>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Cursor" description="Customize cursor appearance and behavior">
        <SettingsCard>
          <SettingsItem title="Cursor Style" description="Choose the cursor shape">
            <SegmentedControl
              value={appearance.cursorStyle}
              onChange={(value) => setCursorStyle(value)}
              options={cursorStyleOptions}
            />
          </SettingsItem>
          <SettingsItem title="Cursor Blink" description="Enable or disable cursor blinking">
            <Switch checked={appearance.cursorBlink} onCheckedChange={setCursorBlink} />
          </SettingsItem>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Color Scheme" description="Terminal colors for dark and light mode">
        <div className="flex justify-end mb-4">
          <SegmentedControl
            value={appearance.themeMode}
            onChange={handleThemeModeChange}
            options={themeModeOptions}
          />
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            type="text"
            placeholder="Search color schemes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-bg-card"
          />
        </div>

        {/* Theme Cards Grid */}
        <div className="grid grid-cols-3 gap-4">
          {filteredSchemes.map((scheme) => (
            <ThemeCard
              key={scheme.id}
              scheme={scheme}
              selected={currentSchemeId === scheme.id}
              onSelect={() => handleSchemeSelect(scheme.id)}
            />
          ))}
        </div>

        {filteredSchemes.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            No color schemes found matching "{searchQuery}"
          </div>
        )}
      </SettingsSection>
    </div>
  );
}

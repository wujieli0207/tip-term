import { useState, useMemo } from "react";
import { useSettingsStore } from "../../../stores/settingsStore";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import SegmentedControl from "../shared/SegmentedControl";
import Slider from "../shared/Slider";
import FontSelect from "../shared/FontSelect";
import ThemeCard from "../theme/ThemeCard";
import { getColorSchemesByMode } from "../../../config/defaultColorSchemes";
import type { ThemeMode } from "../../../types/theme";
import { updateTerminalThemes } from "../../../utils/terminalRegistry";

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

interface SectionHeaderProps {
  title: string;
  description?: string;
}

function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-medium text-[hsl(var(--text-primary))]">{title}</h3>
      {description && (
        <p className="text-sm text-[hsl(var(--text-secondary))] mt-0.5">{description}</p>
      )}
    </div>
  );
}

interface SettingCardProps {
  children: React.ReactNode;
}

function SettingCard({ children }: SettingCardProps) {
  return (
    <div className="bg-[hsl(var(--bg-card))] rounded-lg border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
      {children}
    </div>
  );
}

interface SettingItemProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SettingItem({ title, description, children }: SettingItemProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex-1">
        <div className="text-sm text-[hsl(var(--text-primary))]">{title}</div>
        {description && (
          <div className="text-xs text-[hsl(var(--text-secondary))] mt-0.5">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0 ml-4 flex items-center gap-3">{children}</div>
    </div>
  );
}

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
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-semibold text-[hsl(var(--text-primary))]">Appearance</h2>
        <p className="text-sm text-[hsl(var(--text-secondary))] mt-1">
          Customize the look and feel of your terminal
        </p>
      </div>

      {/* Basic Styles Section */}
      <section>
        <SectionHeader
          title="Basic Styles"
          description="Configure font and text appearance"
        />
        <SettingCard>
          <SettingItem title="Font Family" description="Choose the terminal font">
            <FontSelect value={fontFamily} onChange={handleFontFamilyChange} />
          </SettingItem>
          <SettingItem title="Font Size" description="Adjust the terminal text size">
            <Slider
              value={fontSize}
              onChange={handleFontSizeChange}
              min={10}
              max={24}
            />
            <span className="text-sm text-[hsl(var(--text-secondary))] w-12 text-right">
              {fontSize}px
            </span>
          </SettingItem>
          <SettingItem title="Line Height" description="Spacing between lines">
            <Slider
              value={lineHeight}
              onChange={handleLineHeightChange}
              min={1.0}
              max={2.0}
              step={0.1}
            />
            <span className="text-sm text-[hsl(var(--text-secondary))] w-12 text-right">
              {lineHeight.toFixed(1)}
            </span>
          </SettingItem>
        </SettingCard>
      </section>

      {/* Cursor Section */}
      <section>
        <SectionHeader
          title="Cursor"
          description="Customize cursor appearance and behavior"
        />
        <SettingCard>
          <SettingItem title="Cursor Style" description="Choose the cursor shape">
            <SegmentedControl
              value={appearance.cursorStyle}
              onChange={(value) => setCursorStyle(value)}
              options={cursorStyleOptions}
            />
          </SettingItem>
          <SettingItem title="Cursor Blink" description="Enable or disable cursor blinking">
            <Switch checked={appearance.cursorBlink} onCheckedChange={setCursorBlink} />
          </SettingItem>
        </SettingCard>
      </section>

      {/* Color Scheme Section */}
      <section>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-medium text-[hsl(var(--text-primary))]">
              Color Scheme
            </h3>
            <p className="text-sm text-[hsl(var(--text-secondary))] mt-0.5">
              Terminal colors for dark and light mode
            </p>
          </div>
          <SegmentedControl
            value={appearance.themeMode}
            onChange={handleThemeModeChange}
            options={themeModeOptions}
          />
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--text-muted))]" />
          <Input
            type="text"
            placeholder="Search color schemes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[hsl(var(--bg-card))]"
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
          <div className="text-center py-8 text-[hsl(var(--text-muted))]">
            No color schemes found matching "{searchQuery}"
          </div>
        )}
      </section>
    </div>
  );
}

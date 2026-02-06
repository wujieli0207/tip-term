import { useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import SegmentedControl from "../shared/SegmentedControl";
import Slider from "../shared/Slider";
import FontSelect from "../shared/FontSelect";
import SettingsPageHeader from "../shared/SettingsPageHeader";
import SettingsSection from "../shared/SettingsSection";
import SettingsCard from "../shared/SettingsCard";
import SettingsItem from "../shared/SettingsItem";
import { useTerminalConfigStore } from "../../../stores/terminalConfigStore";
import { applyTerminalConfig, scheduleWriteTerminalConfigFile } from "../../../terminal-core/config/loader";
import type { BellMode, CursorShape, MacOptionSelectionMode } from "../../../terminal-core/config/schema";

const cursorOptions: { value: CursorShape; label: React.ReactNode }[] = [
  { value: "block", label: <span className="font-mono">█</span> },
  { value: "bar", label: <span className="font-mono">|</span> },
  { value: "underline", label: <span className="font-mono">─</span> },
];

const bellOptions: { value: BellMode; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "sound", label: "Sound" },
  { value: "visual", label: "Visual" },
  { value: "both", label: "Both" },
];

const linkKeyOptions = [
  { value: "disabled", label: "Disabled" },
  { value: "meta", label: "Meta" },
  { value: "ctrl", label: "Ctrl" },
  { value: "alt", label: "Alt" },
  { value: "shift", label: "Shift" },
];

const macOptionOptions: { value: MacOptionSelectionMode; label: string }[] = [
  { value: "selection", label: "Selection" },
  { value: "force", label: "Force" },
];

const fontWeightOptions = ["normal", "bold", "400", "500", "600", "700", "800", "900"];

export default function TerminalSection() {
  const { config, setConfig } = useTerminalConfigStore();

  const updateConfig = useCallback(
    (patch: Partial<typeof config>) => {
      const next = { ...config, ...patch };
      setConfig(next);
      applyTerminalConfig(next);
      scheduleWriteTerminalConfigFile(next);
    },
    [config, setConfig]
  );

  const updateModifierKeys = useCallback(
    (patch: Partial<typeof config.modifierKeys>) => {
      updateConfig({
        modifierKeys: { ...config.modifierKeys, ...patch },
      });
    },
    [config.modifierKeys, updateConfig]
  );

  return (
    <div className="space-y-8">
      <SettingsPageHeader
        title="Terminal"
        description="Core terminal behavior, rendering and integration options"
      />

      <SettingsSection title="Font & Layout" description="Typography and spacing">
        <SettingsCard>
          <SettingsItem title="Font Family">
            <FontSelect value={config.fontFamily} onChange={(value) => updateConfig({ fontFamily: value })} />
          </SettingsItem>
          <SettingsItem title="Font Size">
            <Slider value={config.fontSize} onChange={(value) => updateConfig({ fontSize: value })} min={10} max={24} />
            <span className="text-sm text-text-secondary w-12 text-right">{config.fontSize}px</span>
          </SettingsItem>
          <SettingsItem title="Line Height">
            <Slider value={config.lineHeight} onChange={(value) => updateConfig({ lineHeight: value })} min={1.0} max={2.0} step={0.1} />
            <span className="text-sm text-text-secondary w-12 text-right">{config.lineHeight.toFixed(1)}</span>
          </SettingsItem>
          <SettingsItem title="Letter Spacing">
            <Slider value={config.letterSpacing} onChange={(value) => updateConfig({ letterSpacing: value })} min={0} max={2} step={0.1} />
            <span className="text-sm text-text-secondary w-12 text-right">{config.letterSpacing.toFixed(1)}px</span>
          </SettingsItem>
          <SettingsItem title="Font Weight">
            <select
              className="bg-bg-card border border-border-subtle text-sm rounded-md px-2 py-1"
              value={String(config.fontWeight)}
              onChange={(e) => {
                const value = e.target.value;
                const parsed = Number(value);
                updateConfig({ fontWeight: Number.isNaN(parsed) ? value : parsed });
              }}
            >
              {fontWeightOptions.map((weight) => (
                <option key={weight} value={weight}>{weight}</option>
              ))}
            </select>
          </SettingsItem>
          <SettingsItem title="Bold Weight">
            <select
              className="bg-bg-card border border-border-subtle text-sm rounded-md px-2 py-1"
              value={String(config.fontWeightBold)}
              onChange={(e) => {
                const value = e.target.value;
                const parsed = Number(value);
                updateConfig({ fontWeightBold: Number.isNaN(parsed) ? value : parsed });
              }}
            >
              {fontWeightOptions.map((weight) => (
                <option key={weight} value={weight}>{weight}</option>
              ))}
            </select>
          </SettingsItem>
          <SettingsItem title="Padding" description="CSS padding, e.g. 8px 12px">
            <Input
              value={config.padding}
              onChange={(e) => updateConfig({ padding: e.target.value })}
              className="w-40"
            />
          </SettingsItem>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Behavior" description="Input and accessibility">
        <SettingsCard>
          <SettingsItem title="Scrollback">
            <Slider value={config.scrollback} onChange={(value) => updateConfig({ scrollback: value })} min={1000} max={50000} step={500} />
            <span className="text-sm text-text-secondary w-16 text-right">{config.scrollback}</span>
          </SettingsItem>
          <SettingsItem title="Quick Edit" description="Right click copy/paste">
            <Switch checked={config.quickEdit} onCheckedChange={(value) => updateConfig({ quickEdit: value })} />
          </SettingsItem>
          <SettingsItem title="Copy on Select">
            <Switch checked={config.copyOnSelect} onCheckedChange={(value) => updateConfig({ copyOnSelect: value })} />
          </SettingsItem>
          <SettingsItem title="Screen Reader Mode">
            <Switch checked={config.screenReaderMode} onCheckedChange={(value) => updateConfig({ screenReaderMode: value })} />
          </SettingsItem>
          <SettingsItem title="Cursor Style">
            <SegmentedControl
              value={config.cursorShape}
              onChange={(value) => updateConfig({ cursorShape: value })}
              options={cursorOptions}
            />
          </SettingsItem>
          <SettingsItem title="Cursor Blink">
            <Switch checked={config.cursorBlink} onCheckedChange={(value) => updateConfig({ cursorBlink: value })} />
          </SettingsItem>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Renderer" description="Performance and rendering features">
        <SettingsCard>
          <SettingsItem title="WebGL Renderer">
            <Switch checked={config.webGLRenderer} onCheckedChange={(value) => updateConfig({ webGLRenderer: value })} />
          </SettingsItem>
          <SettingsItem title="Ligatures">
            <Switch checked={config.ligatures} onCheckedChange={(value) => updateConfig({ ligatures: value })} />
          </SettingsItem>
          <SettingsItem title="Image Support">
            <Switch checked={config.imageSupport} onCheckedChange={(value) => updateConfig({ imageSupport: value })} />
          </SettingsItem>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Bell" description="Sound and visual bell feedback">
        <SettingsCard>
          <SettingsItem title="Bell Mode">
            <SegmentedControl
              value={config.bell}
              onChange={(value) => updateConfig({ bell: value })}
              options={bellOptions}
            />
          </SettingsItem>
          <SettingsItem title="Bell Sound URL" description="Optional custom audio URL">
            <Input
              value={config.bellSoundURL ?? ""}
              onChange={(e) => updateConfig({ bellSoundURL: e.target.value.trim() || null })}
              className="w-56"
            />
          </SettingsItem>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Links" description="Link activation behavior">
        <SettingsCard>
          <SettingsItem title="Activation Key">
            <select
              className="bg-bg-card border border-border-subtle text-sm rounded-md px-2 py-1"
              value={config.webLinksActivationKey ?? "disabled"}
              onChange={(e) => {
                const value = e.target.value === "disabled" ? null : e.target.value;
                updateConfig({ webLinksActivationKey: value });
              }}
            >
              {linkKeyOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </SettingsItem>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Advanced">
        <SettingsCard>
          <SettingsItem title="Option Key as Meta">
            <Switch checked={config.modifierKeys.altIsMeta} onCheckedChange={(value) => updateModifierKeys({ altIsMeta: value })} />
          </SettingsItem>
          <SettingsItem title="Command Key as Meta">
            <Switch checked={config.modifierKeys.cmdIsMeta} onCheckedChange={(value) => updateModifierKeys({ cmdIsMeta: value })} />
          </SettingsItem>
          <SettingsItem title="macOS Option Selection">
            <SegmentedControl
              value={config.macOptionSelectionMode}
              onChange={(value) => updateConfig({ macOptionSelectionMode: value })}
              options={macOptionOptions}
            />
          </SettingsItem>
        </SettingsCard>
      </SettingsSection>
    </div>
  );
}

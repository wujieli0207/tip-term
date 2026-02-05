import { useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import SegmentedControl from "../shared/SegmentedControl";
import Slider from "../shared/Slider";
import FontSelect from "../shared/FontSelect";
import { useTerminalConfigStore } from "../../../stores/terminalConfigStore";
import { applyTerminalConfig, scheduleWriteTerminalConfigFile } from "../../../terminal-core/config/loader";
import type { BellMode, CursorShape, MacOptionSelectionMode } from "../../../terminal-core/config/schema";

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
      <div>
        <h2 className="text-2xl font-semibold text-[hsl(var(--text-primary))]">Terminal</h2>
        <p className="text-sm text-[hsl(var(--text-secondary))] mt-1">
          Core terminal behavior, rendering and integration options
        </p>
      </div>

      <section>
        <SectionHeader title="Font & Layout" description="Typography and spacing" />
        <SettingCard>
          <SettingItem title="Font Family">
            <FontSelect value={config.fontFamily} onChange={(value) => updateConfig({ fontFamily: value })} />
          </SettingItem>
          <SettingItem title="Font Size">
            <Slider value={config.fontSize} onChange={(value) => updateConfig({ fontSize: value })} min={10} max={24} />
            <span className="text-sm text-[hsl(var(--text-secondary))] w-12 text-right">{config.fontSize}px</span>
          </SettingItem>
          <SettingItem title="Line Height">
            <Slider value={config.lineHeight} onChange={(value) => updateConfig({ lineHeight: value })} min={1.0} max={2.0} step={0.1} />
            <span className="text-sm text-[hsl(var(--text-secondary))] w-12 text-right">{config.lineHeight.toFixed(1)}</span>
          </SettingItem>
          <SettingItem title="Letter Spacing">
            <Slider value={config.letterSpacing} onChange={(value) => updateConfig({ letterSpacing: value })} min={0} max={2} step={0.1} />
            <span className="text-sm text-[hsl(var(--text-secondary))] w-12 text-right">{config.letterSpacing.toFixed(1)}px</span>
          </SettingItem>
          <SettingItem title="Font Weight">
            <select
              className="bg-[hsl(var(--bg-input))] border border-[hsl(var(--border))] text-sm rounded-md px-2 py-1"
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
          </SettingItem>
          <SettingItem title="Bold Weight">
            <select
              className="bg-[hsl(var(--bg-input))] border border-[hsl(var(--border))] text-sm rounded-md px-2 py-1"
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
          </SettingItem>
          <SettingItem title="Padding" description="CSS padding, e.g. 8px 12px">
            <Input
              value={config.padding}
              onChange={(e) => updateConfig({ padding: e.target.value })}
              className="w-40"
            />
          </SettingItem>
        </SettingCard>
      </section>

      <section>
        <SectionHeader title="Behavior" description="Input and accessibility" />
        <SettingCard>
          <SettingItem title="Scrollback">
            <Slider value={config.scrollback} onChange={(value) => updateConfig({ scrollback: value })} min={1000} max={50000} step={500} />
            <span className="text-sm text-[hsl(var(--text-secondary))] w-16 text-right">{config.scrollback}</span>
          </SettingItem>
          <SettingItem title="Quick Edit" description="Right click copy/paste">
            <Switch checked={config.quickEdit} onCheckedChange={(value) => updateConfig({ quickEdit: value })} />
          </SettingItem>
          <SettingItem title="Copy on Select">
            <Switch checked={config.copyOnSelect} onCheckedChange={(value) => updateConfig({ copyOnSelect: value })} />
          </SettingItem>
          <SettingItem title="Screen Reader Mode">
            <Switch checked={config.screenReaderMode} onCheckedChange={(value) => updateConfig({ screenReaderMode: value })} />
          </SettingItem>
          <SettingItem title="Cursor Style">
            <SegmentedControl
              value={config.cursorShape}
              onChange={(value) => updateConfig({ cursorShape: value })}
              options={cursorOptions}
            />
          </SettingItem>
          <SettingItem title="Cursor Blink">
            <Switch checked={config.cursorBlink} onCheckedChange={(value) => updateConfig({ cursorBlink: value })} />
          </SettingItem>
        </SettingCard>
      </section>

      <section>
        <SectionHeader title="Renderer" description="Performance and rendering features" />
        <SettingCard>
          <SettingItem title="WebGL Renderer">
            <Switch checked={config.webGLRenderer} onCheckedChange={(value) => updateConfig({ webGLRenderer: value })} />
          </SettingItem>
          <SettingItem title="Ligatures">
            <Switch checked={config.ligatures} onCheckedChange={(value) => updateConfig({ ligatures: value })} />
          </SettingItem>
          <SettingItem title="Image Support">
            <Switch checked={config.imageSupport} onCheckedChange={(value) => updateConfig({ imageSupport: value })} />
          </SettingItem>
        </SettingCard>
      </section>

      <section>
        <SectionHeader title="Bell" description="Sound and visual bell feedback" />
        <SettingCard>
          <SettingItem title="Bell Mode">
            <SegmentedControl
              value={config.bell}
              onChange={(value) => updateConfig({ bell: value })}
              options={bellOptions}
            />
          </SettingItem>
          <SettingItem title="Bell Sound URL" description="Optional custom audio URL">
            <Input
              value={config.bellSoundURL ?? ""}
              onChange={(e) => updateConfig({ bellSoundURL: e.target.value.trim() || null })}
              className="w-56"
            />
          </SettingItem>
        </SettingCard>
      </section>

      <section>
        <SectionHeader title="Links" description="Link activation behavior" />
        <SettingCard>
          <SettingItem title="Activation Key">
            <select
              className="bg-[hsl(var(--bg-input))] border border-[hsl(var(--border))] text-sm rounded-md px-2 py-1"
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
          </SettingItem>
        </SettingCard>
      </section>

      <section>
        <SectionHeader title="Advanced" />
        <SettingCard>
          <SettingItem title="Option Key as Meta">
            <Switch checked={config.modifierKeys.altIsMeta} onCheckedChange={(value) => updateModifierKeys({ altIsMeta: value })} />
          </SettingItem>
          <SettingItem title="Command Key as Meta">
            <Switch checked={config.modifierKeys.cmdIsMeta} onCheckedChange={(value) => updateModifierKeys({ cmdIsMeta: value })} />
          </SettingItem>
          <SettingItem title="macOS Option Selection">
            <SegmentedControl
              value={config.macOptionSelectionMode}
              onChange={(value) => updateConfig({ macOptionSelectionMode: value })}
              options={macOptionOptions}
            />
          </SettingItem>
        </SettingCard>
      </section>
    </div>
  );
}

import { useSettingsStore } from "../../../stores/settingsStore";
import SettingRow from "../shared/SettingRow";
import RadioGroup from "../shared/RadioGroup";
import { Switch } from "@/components/ui/switch";

const cursorStyleOptions = [
  { value: "block", label: "Block █" },
  { value: "bar", label: "Bar |" },
  { value: "underline", label: "Line _" },
];

export default function AppearanceSection() {
  const { appearance, setCursorStyle, setCursorBlink } = useSettingsStore();

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-200 mb-6">Appearance</h2>

      <div className="space-y-0">
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

import { useSettingsStore } from "../../../stores/settingsStore";
import SettingRow from "../shared/SettingRow";
import RadioGroup from "../shared/RadioGroup";

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
          <button
            onClick={() => setCursorBlink(!appearance.cursorBlink)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              appearance.cursorBlink ? "bg-purple-600" : "bg-[#3a3a3a]"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                appearance.cursorBlink ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </SettingRow>
      </div>
    </div>
  );
}

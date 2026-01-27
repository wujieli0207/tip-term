import { useState } from "react";
import SettingsSidebar from "./SettingsSidebar";
import ApplicationSection from "./sections/ApplicationSection";
import AppearanceSection from "./sections/AppearanceSection";
import HotkeySection from "./sections/HotkeySection";

type SettingsSection = "application" | "appearance" | "hotkeys";

export default function SettingsContainer() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("application");

  return (
    <div className="flex h-full bg-[#0a0a0a]">
      <SettingsSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[600px] mx-auto p-8">
          {activeSection === "application" && <ApplicationSection />}
          {activeSection === "appearance" && <AppearanceSection />}
          {activeSection === "hotkeys" && <HotkeySection />}
        </div>
      </div>
    </div>
  );
}

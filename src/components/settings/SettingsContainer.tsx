import { useState } from "react";
import SettingsSidebar from "./SettingsSidebar";
import ApplicationSection from "./sections/ApplicationSection";
import AppearanceSection from "./sections/AppearanceSection";
import HotkeySection from "./sections/HotkeySection";
import TerminalSection from "./sections/TerminalSection";
import ProfilesSection from "./sections/ProfilesSection";

type SettingsSection = "application" | "appearance" | "hotkeys" | "terminal" | "profiles";

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
          {activeSection === "terminal" && <TerminalSection />}
          {activeSection === "profiles" && <ProfilesSection />}
        </div>
      </div>
    </div>
  );
}

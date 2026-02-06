import { IconTerminal2 } from "@/components/ui/icons";
import SettingsPageHeader from "../shared/SettingsPageHeader";
import SettingsSection from "../shared/SettingsSection";
import SettingsCard from "../shared/SettingsCard";

export default function ApplicationSection() {
  return (
    <div className="space-y-8">
      <SettingsPageHeader
        title="Application"
        description="Version info and about"
      />

      <SettingsSection title="App Info" description="Current application details">
        <SettingsCard className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent-primary rounded-lg flex items-center justify-center">
              <IconTerminal2 className="w-7 h-7 text-white" stroke={2} />
            </div>
            <div>
              <div className="text-text-primary font-medium">TipTerm</div>
              <div className="text-sm text-text-muted">Version 0.1.0</div>
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="About" description="What TipTerm focuses on">
        <SettingsCard>
          <p className="px-4 py-3 text-sm text-text-muted leading-relaxed">
            TipTerm is a modern terminal emulator built with Tauri, React, and xterm.js.
            It provides a fast, native experience with GPU-accelerated rendering.
          </p>
        </SettingsCard>
      </SettingsSection>

    </div>
  );
}

import SettingsPageHeader from "../shared/SettingsPageHeader";
import SettingsSection from "../shared/SettingsSection";
import SettingsCard from "../shared/SettingsCard";

export default function ProfilesSection() {
  return (
    <div className="space-y-8">
      <SettingsPageHeader
        title="Profiles"
        description="Save and reuse terminal preferences"
      />

      <SettingsSection title="Profiles" description="Manage saved terminal profiles">
        <SettingsCard>
          <p className="px-4 py-3 text-sm text-text-muted leading-relaxed">
            Profile management coming soon...
          </p>
        </SettingsCard>
      </SettingsSection>
    </div>
  );
}

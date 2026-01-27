import { IconInfoCircle, IconPalette, IconKeyboard } from "@/components/ui/icons";

type SettingsSection = "application" | "appearance" | "hotkeys";

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

const sections: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
  {
    id: "application",
    label: "Application",
    icon: <IconInfoCircle className="w-4 h-4" stroke={2} />,
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: <IconPalette className="w-4 h-4" stroke={2} />,
  },
  {
    id: "hotkeys",
    label: "Hotkeys",
    icon: <IconKeyboard className="w-4 h-4" stroke={2} />,
  },
];

export default function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <div className="w-[222px] h-full bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col">
      <div className="p-4 border-b border-[#2a2a2a]">
        <h1 className="text-lg font-semibold text-gray-200">Settings</h1>
      </div>

      <nav className="flex-1 py-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              activeSection === section.id
                ? "bg-purple-800/50 text-white"
                : "text-gray-400 hover:bg-[#2a2a2a] hover:text-gray-300"
            }`}
          >
            {section.icon}
            {section.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

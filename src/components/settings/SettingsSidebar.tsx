import { IconSettings, IconPalette, IconKeyboard, IconTerminal2, IconUser } from "@/components/ui/icons";

type SettingsSection = "application" | "appearance" | "hotkeys" | "terminal" | "profiles";

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

const sections: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
  {
    id: "application",
    label: "Application",
    icon: <IconSettings className="w-[18px] h-[18px]" stroke={1.5} />,
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: <IconPalette className="w-[18px] h-[18px]" stroke={1.5} />,
  },
  {
    id: "hotkeys",
    label: "Hotkeys",
    icon: <IconKeyboard className="w-[18px] h-[18px]" stroke={1.5} />,
  },
  {
    id: "terminal",
    label: "Terminal",
    icon: <IconTerminal2 className="w-[18px] h-[18px]" stroke={1.5} />,
  },
  {
    id: "profiles",
    label: "Profiles",
    icon: <IconUser className="w-[18px] h-[18px]" stroke={1.5} />,
  },
];

export default function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <div className="w-[260px] h-full bg-[hsl(var(--bg-sidebar))] border-r border-[hsl(var(--border))] flex flex-col">
      <div className="px-4 py-6 border-b border-[hsl(var(--border))]">
        <h1 className="text-lg font-semibold text-[hsl(var(--text-primary))]">Settings</h1>
      </div>

      <nav className="flex-1 px-4 py-6">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={`w-full flex items-center gap-3 px-3 h-10 rounded-lg text-sm transition-colors ${
              activeSection === section.id
                ? "bg-[hsl(var(--bg-active))] [&>svg]:text-[hsl(var(--accent-primary))] text-[hsl(var(--text-primary))] font-medium"
                : "text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-hover))]"
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

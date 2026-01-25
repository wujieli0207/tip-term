type SettingsSection = "application" | "appearance" | "hotkeys";

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

const sections: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
  {
    id: "application",
    label: "Application",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
        />
      </svg>
    ),
  },
  {
    id: "hotkeys",
    label: "Hotkeys",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth={2} />
        <path
          strokeLinecap="round"
          strokeWidth={2}
          d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"
        />
      </svg>
    ),
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

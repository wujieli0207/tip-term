interface SettingRowProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export default function SettingRow({ title, description, children, className = "" }: SettingRowProps) {
  return (
    <div className={`flex items-center justify-between py-4 border-b border-[#2a2a2a] ${className}`}>
      <div className="flex-1">
        <div className="text-sm text-gray-300">{title}</div>
        {description && (
          <div className="text-xs text-gray-500 mt-0.5">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0 ml-4">{children}</div>
    </div>
  );
}

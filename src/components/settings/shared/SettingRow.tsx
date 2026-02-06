interface SettingRowProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export default function SettingRow({ title, description, children, className = "" }: SettingRowProps) {
  return (
    <div className={`flex items-center justify-between py-4 border-b border-border-subtle ${className}`}>
      <div className="flex-1">
        <div className="text-sm text-text-secondary">{title}</div>
        {description && (
          <div className="text-xs text-text-muted mt-0.5">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0 ml-4">{children}</div>
    </div>
  );
}

interface SettingsItemProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export default function SettingsItem({ title, description, children, className = "" }: SettingsItemProps) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${className}`}>
      <div className="flex-1">
        <div className="text-sm text-text-primary">{title}</div>
        {description && (
          <div className="text-xs text-text-secondary mt-0.5">{description}</div>
        )}
      </div>
      {children && (
        <div className="flex-shrink-0 ml-4 flex items-center gap-3">{children}</div>
      )}
    </div>
  );
}

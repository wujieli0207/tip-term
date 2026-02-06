interface SettingsPageHeaderProps {
  title: string;
  description?: string;
}

export default function SettingsPageHeader({ title, description }: SettingsPageHeaderProps) {
  return (
    <div>
      <h2 className="text-lg font-medium text-text-primary">{title}</h2>
      {description && (
        <p className="text-xs text-text-muted mt-1">{description}</p>
      )}
    </div>
  );
}

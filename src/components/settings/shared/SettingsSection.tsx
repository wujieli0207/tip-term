interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section>
      <div className="mb-4">
        <h3 className="text-sm font-medium text-text-primary">{title}</h3>
        {description && (
          <p className="text-xs text-text-muted mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

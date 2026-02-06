interface SettingsCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function SettingsCard({ children, className = "" }: SettingsCardProps) {
  return (
    <div className={`bg-bg-card rounded-lg border border-border-subtle divide-y divide-border-subtle ${className}`}>
      {children}
    </div>
  );
}

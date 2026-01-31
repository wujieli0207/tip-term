interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <div className="text-[10px] font-sans font-medium text-text-secondary uppercase tracking-wide mb-1">
      {title}
    </div>
  );
}

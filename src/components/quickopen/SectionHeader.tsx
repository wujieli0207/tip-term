interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <div className="px-3 py-1.5 text-xs text-gray-400 font-medium bg-[#1a1a1a] sticky top-0 border-b border-[#2a2a2a]">
      {title}
    </div>
  );
}

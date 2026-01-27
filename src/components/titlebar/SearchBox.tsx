import { IconSearch } from "@/components/ui/icons";

interface SearchBoxProps {
  className?: string;
}

export default function SearchBox({ className = "" }: SearchBoxProps) {
  return (
    <div
      data-tauri-drag-region
      className={`flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-gray-500 ${className}`}
    >
      <IconSearch className="w-4 h-4" stroke={2} />
      <span>Search...</span>
      <span className="ml-auto text-xs text-gray-600">Cmd+P</span>
    </div>
  );
}

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const FONT_OPTIONS = [
  { value: "JetBrains Mono", label: "JetBrains Mono" },
  { value: "Fira Code", label: "Fira Code" },
  { value: "Source Code Pro", label: "Source Code Pro" },
  { value: "Menlo", label: "Menlo" },
  { value: "Monaco", label: "Monaco" },
  { value: "Consolas", label: "Consolas" },
];

interface FontSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export default function FontSelect({ value, onChange }: FontSelectProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 rounded-md bg-[hsl(var(--bg-hover))] hover:bg-[hsl(var(--bg-active))] text-sm text-[hsl(var(--text-primary))] transition-colors min-w-[160px] justify-between">
          <span style={{ fontFamily: value }}>{value}</span>
          <ChevronDown className="w-4 h-4 text-[hsl(var(--text-secondary))]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {FONT_OPTIONS.map((font) => (
          <DropdownMenuItem
            key={font.value}
            onClick={() => onChange(font.value)}
            className={`cursor-pointer ${value === font.value ? "bg-[hsl(var(--bg-active))]" : ""}`}
            style={{ fontFamily: font.value }}
          >
            {font.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

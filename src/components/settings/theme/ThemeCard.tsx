import type { TerminalColorScheme } from "../../../types/theme";
import { cn } from "@/lib/utils";

interface ThemeCardProps {
  scheme: TerminalColorScheme;
  selected: boolean;
  onSelect: () => void;
}

export default function ThemeCard({ scheme, selected, onSelect }: ThemeCardProps) {
  // Extract key colors for the preview
  const blue = scheme.colors[4]; // blue
  const green = scheme.colors[2]; // green

  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative flex flex-col rounded-lg overflow-hidden transition-all",
        "border hover:border-[hsl(var(--text-muted))]",
        selected
          ? "border-[hsl(var(--accent-primary))] border-2"
          : "border-[hsl(var(--border))]"
      )}
    >
      {/* Terminal Preview */}
      <div
        className="p-3 font-mono text-xs leading-relaxed text-left"
        style={{ backgroundColor: scheme.background }}
      >
        <div className="flex items-center gap-1">
          <span style={{ color: green }}>john@mac</span>
          <span style={{ color: scheme.foreground }}>:</span>
          <span style={{ color: blue }}>~</span>
          <span style={{ color: scheme.foreground }}>$ ls</span>
        </div>
        <div className="mt-1">
          <span style={{ color: blue }}>Documents/</span>
          <span style={{ color: scheme.foreground }}> </span>
        </div>
        <div>
          <span style={{ color: green }}>Downloads/</span>
        </div>
        <div>
          <span style={{ color: scheme.foreground }}>config.json</span>
        </div>
      </div>

      {/* Theme Name and Color Dots */}
      <div
        className="flex items-center justify-between px-3 py-2 border-t"
        style={{
          backgroundColor: scheme.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
          borderColor: scheme.mode === 'dark' ? '#333' : '#e0e0e0',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium"
            style={{ color: scheme.mode === 'dark' ? '#e5e5e5' : '#333' }}
          >
            {scheme.name}
          </span>
        </div>
      </div>
    </button>
  );
}

import type { TerminalColorScheme } from "../../../types/theme";
import { cn } from "@/lib/utils";

interface ThemeCardProps {
  scheme: TerminalColorScheme;
  selected: boolean;
  onSelect: () => void;
}

export default function ThemeCard({ scheme, selected, onSelect }: ThemeCardProps) {
  // Extract ANSI colors for the preview
  const red = scheme.colors[1];     // red - for errors
  const green = scheme.colors[2];   // green - for user, executables
  const yellow = scheme.colors[3];  // yellow - for warnings
  const blue = scheme.colors[4];    // blue - for directories
  const magenta = scheme.colors[5]; // magenta - for special files
  const cyan = scheme.colors[6];    // cyan - for links, commands

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
        {/* Prompt line */}
        <div className="flex items-center gap-1">
          <span style={{ color: green }}>john@mac</span>
          <span style={{ color: scheme.foreground }}>:</span>
          <span style={{ color: blue }}>~/code</span>
          <span style={{ color: scheme.foreground }}>$ </span>
          <span style={{ color: cyan }}>ls</span>
          <span style={{ color: yellow }}> -la</span>
        </div>
        {/* ls output with various colors */}
        <div className="mt-1">
          <span style={{ color: cyan }}>Documents/</span>
          {" "}
          <span style={{ color: magenta }}>link@</span>
          {" "}
          <span style={{ color: green }}>run.sh*</span>
        </div>
        <div>
          <span style={{ color: scheme.foreground }}>config.json</span>
        </div>
        {/* Error message */}
        <div>
          <span style={{ color: red }}>error:</span>
          <span style={{ color: scheme.foreground }}> not found</span>
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

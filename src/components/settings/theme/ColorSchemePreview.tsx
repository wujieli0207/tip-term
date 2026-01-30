import type { TerminalColorScheme } from '../../../types/theme';

interface ColorSchemePreviewProps {
  scheme: TerminalColorScheme;
  className?: string;
}

const ANSI_NAMES = [
  'Black', 'Red', 'Green', 'Yellow',
  'Blue', 'Magenta', 'Cyan', 'White',
  'Bright Black', 'Bright Red', 'Bright Green', 'Bright Yellow',
  'Bright Blue', 'Bright Magenta', 'Bright Cyan', 'Bright White',
];

export default function ColorSchemePreview({ scheme, className = '' }: ColorSchemePreviewProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main colors preview */}
      <div className="flex gap-2">
        {/* Foreground */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-10 h-10 rounded border border-[var(--border)]"
            style={{ backgroundColor: scheme.foreground }}
            title="Foreground"
          />
          <span className="text-xs text-[var(--text-muted)]">FG</span>
        </div>

        {/* Background */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-10 h-10 rounded border border-[var(--border)]"
            style={{ backgroundColor: scheme.background }}
            title="Background"
          />
          <span className="text-xs text-[var(--text-muted)]">BG</span>
        </div>

        {/* Cursor */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-10 h-10 rounded border border-[var(--border)]"
            style={{
              backgroundColor: scheme.cursorAccent || scheme.background,
              position: 'relative',
            }}
            title="Cursor"
          >
            <div
              className="absolute inset-0 flex items-center justify-center text-xs font-bold"
              style={{ color: scheme.cursor }}
            >
              A
            </div>
          </div>
          <span className="text-xs text-[var(--text-muted)]">Cursor</span>
        </div>

        {/* Selection */}
        {scheme.selectionBackground && (
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-10 h-10 rounded border border-[var(--border)]"
              style={{
                backgroundColor: scheme.selectionBackground,
                color: scheme.foreground,
              }}
              title="Selection"
            >
              <div className="flex items-center justify-center h-full text-xs font-bold">
                Sel
              </div>
            </div>
            <span className="text-xs text-[var(--text-muted)]">Sel</span>
          </div>
        )}
      </div>

      {/* ANSI colors grid */}
      <div className="grid grid-cols-8 gap-1">
        {scheme.colors.map((color, index) => (
          <div
            key={index}
            className="w-full aspect-square rounded border border-[var(--border)]"
            style={{ backgroundColor: color }}
            title={`${ANSI_NAMES[index]}: ${color}`}
          />
        ))}
      </div>

      {/* ANSI color names */}
      <div className="grid grid-cols-8 gap-1">
        {ANSI_NAMES.map((name, index) => (
          <div
            key={index}
            className="text-[10px] text-[var(--text-muted)] text-center truncate"
            title={name}
          >
            {name.split(' ')[0]}
          </div>
        ))}
      </div>
    </div>
  );
}

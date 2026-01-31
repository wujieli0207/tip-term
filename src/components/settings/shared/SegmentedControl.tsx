import { cn } from "@/lib/utils";

interface SegmentedControlOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedControlOption<T>[];
  className?: string;
}

export default function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex rounded-md bg-[hsl(var(--bg-hover))] p-0.5",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            value === option.value
              ? "bg-[hsl(var(--accent-primary))] text-white"
              : "text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))]"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

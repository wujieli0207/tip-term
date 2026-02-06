interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
}

export default function RadioGroup({ value, onChange, options }: RadioGroupProps) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-border-subtle">
      {options.map((option, index) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-sm transition-colors ${
            value === option.value
              ? "bg-accent-primary text-white"
              : "bg-bg-active text-text-secondary hover:bg-bg-hover"
          } ${index > 0 ? "border-l border-border-subtle" : ""}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

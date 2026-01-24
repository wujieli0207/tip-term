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
    <div className="flex rounded-lg overflow-hidden border border-[#3a3a3a]">
      {options.map((option, index) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-sm transition-colors ${
            value === option.value
              ? "bg-purple-600 text-white"
              : "bg-[#1a1a1a] text-gray-300 hover:bg-[#2a2a2a]"
          } ${index > 0 ? "border-l border-[#3a3a3a]" : ""}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

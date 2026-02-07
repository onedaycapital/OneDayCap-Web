"use client";

export interface RadioTileOption {
  value: string;
  label: string;
}

interface RadioTilesProps {
  name: string;
  question: string;
  instruction?: string;
  options: RadioTileOption[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** When true and value is empty, highlight the tile group (pending completion) */
  highlightEmpty?: boolean;
}

export function RadioTiles({
  name,
  question,
  instruction = "Choose one of the options provided:",
  options,
  value,
  onChange,
  required,
  highlightEmpty,
}: RadioTilesProps) {
  const isEmpty = required && !(value && String(value).trim());
  const showHighlight = highlightEmpty && isEmpty;
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-700">
        {question} {required && "*"}
      </p>
      {instruction && (
        <p className="text-slate-600 text-sm">{instruction}</p>
      )}
      <div
        className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 transition-colors ${showHighlight ? "rounded-lg ring-2 ring-amber-400 ring-offset-2 p-1" : ""}`}
        role="radiogroup"
        aria-label={question}
      >
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 transition-colors ${
                isSelected
                  ? "border-[var(--brand-blue)] bg-[var(--brand-blue)]/5"
                  : showHighlight
                    ? "border-amber-200 bg-amber-50/50 hover:border-amber-300"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="sr-only"
                required={required}
                aria-checked={isSelected}
              />
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  isSelected
                    ? "border-[var(--brand-blue)] bg-[var(--brand-blue)]"
                    : "border-slate-300 bg-white"
                }`}
                aria-hidden
              >
                {isSelected && (
                  <span className="h-2 w-2 rounded-full bg-white" />
                )}
              </span>
              <span className="font-medium text-slate-800">{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

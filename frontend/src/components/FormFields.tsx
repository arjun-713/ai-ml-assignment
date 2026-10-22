import type { ReactNode } from "react";
import { AlertTriangle, ChevronDown, Info } from "lucide-react";
import clsx from "clsx";
import type { FeatureDefinition, FeatureKey } from "../types";
import { isOutsideObservedRange } from "../lib/form";

interface BaseFieldProps {
  feature: FeatureDefinition;
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (key: FeatureKey, value: string) => void;
}

function FieldShell({
  feature,
  error,
  children,
  describedBy,
  controlId = `input-${feature.key}`,
  labelId,
}: {
  feature: FeatureDefinition;
  error?: string;
  children: ReactNode;
  describedBy: string;
  controlId?: string;
  labelId?: string;
}) {
  return (
    <div id={`field-${feature.key}`} className="min-w-0">
      <div className="field-label">
        <label
          id={labelId}
          htmlFor={controlId}
          className="flex items-center gap-1.5"
        >
          {feature.label}
          {!feature.required && (
            <span className="rounded-full bg-sage-100 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-forest-600">
              Optional
            </span>
          )}
        </label>
        {feature.unit && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">
            {feature.unit}
          </span>
        )}
      </div>
      {children}
      <div aria-live="polite">
        {error ? (
          <p
            id={`error-${feature.key}`}
            role="alert"
            className="mt-1.5 flex items-start gap-1 text-[11px] font-semibold text-coral-600"
          >
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            {error}
          </p>
        ) : (
          <p id={describedBy} className="field-help">
            {feature.help}
          </p>
        )}
      </div>
    </div>
  );
}

const NUMBER_PLACEHOLDERS: Partial<Record<FeatureKey, string>> = {
  age: "e.g. 58",
  trestbps: "e.g. 130",
  chol: "e.g. 240",
  thalach: "e.g. 150",
  oldpeak: "e.g. 1.2",
};

export function NumberField({
  feature,
  value,
  error,
  disabled,
  onChange,
}: BaseFieldProps) {
  const outOfRange = isOutsideObservedRange(feature.key, value);
  const describedBy = `help-${feature.key}`;
  return (
    <FieldShell feature={feature} error={error} describedBy={describedBy}>
      <div className="input-shell">
        <input
          id={`input-${feature.key}`}
          name={feature.key}
          type="number"
          inputMode={feature.step === 1 ? "numeric" : "decimal"}
          min={feature.min}
          max={feature.max}
          step={feature.step}
          value={value}
          disabled={disabled}
          placeholder={NUMBER_PLACEHOLDERS[feature.key]}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `error-${feature.key}` : describedBy}
          onChange={(event) => onChange(feature.key, event.target.value)}
          className={clsx(
            "text-input pr-20",
            error && "border-coral-400 bg-coral-50/40 focus:border-coral-500",
          )}
        />
        {feature.unit && <span className="unit-chip">{feature.unit}</span>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted/80">
        <span>
          Training range: {feature.observedMin}
          {feature.step === 0.1 ? ".0" : ""}–{feature.observedMax}
          {feature.unit ? ` ${feature.unit}` : ""}
        </span>
        {outOfRange && (
          <span className="inline-flex items-center gap-1 font-semibold text-gold-700">
            <Info className="h-3 w-3" /> Outside cohort range
          </span>
        )}
      </div>
    </FieldShell>
  );
}

export function SelectField({
  feature,
  value,
  error,
  disabled,
  onChange,
}: BaseFieldProps) {
  const describedBy = `help-${feature.key}`;
  const selectedOption = feature.options?.find(
    (option) => String(option.value) === value,
  );
  return (
    <FieldShell feature={feature} error={error} describedBy={describedBy}>
      <div className="input-shell">
        <select
          id={`input-${feature.key}`}
          name={feature.key}
          value={value}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `error-${feature.key}` : describedBy}
          onChange={(event) => onChange(feature.key, event.target.value)}
          className={clsx(
            "select-input",
            !value && "text-muted/70",
            error && "border-coral-400 bg-coral-50/40 focus:border-coral-500",
          )}
        >
          {feature.required ? (
            <option value="" disabled>
              Select an option
            </option>
          ) : (
            <option value="">Not recorded</option>
          )}
          {feature.options?.map((option) => (
            <option key={option.value} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
      {selectedOption?.description && (
        <p className="mt-2 border-l-2 border-sage-300 pl-2.5 text-[10.5px] leading-relaxed text-forest-700/75">
          {selectedOption.description}
        </p>
      )}
    </FieldShell>
  );
}

export function SegmentedField({
  feature,
  value,
  error,
  disabled,
  onChange,
}: BaseFieldProps) {
  const describedBy = `help-${feature.key}`;
  return (
    <FieldShell
      feature={feature}
      error={error}
      describedBy={describedBy}
      controlId={undefined}
      labelId={`label-${feature.key}`}
    >
      <div
        role="group"
        aria-labelledby={`label-${feature.key}`}
        aria-describedby={error ? `error-${feature.key}` : describedBy}
        className={clsx(
          "mt-2.5 grid gap-1 rounded-xl border border-line-strong bg-white/55 p-1",
          feature.options?.length === 2 ? "grid-cols-2" : "grid-cols-3",
          error && "border-coral-400",
        )}
      >
        {feature.options?.map((option) => {
          const selected = value === String(option.value);
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onChange(feature.key, String(option.value))}
              className={clsx(
                "min-h-10 rounded-lg px-2 py-2 text-[11.5px] font-semibold leading-tight transition duration-150 disabled:opacity-60",
                selected
                  ? "bg-forest-900 text-paper shadow-sm"
                  : "text-muted hover:bg-sage-100/70 hover:text-ink",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </FieldShell>
  );
}

export function FeatureField(props: BaseFieldProps) {
  if (props.feature.inputType === "number") {
    return <NumberField {...props} />;
  }
  if (props.feature.key === "sex" || props.feature.key === "exang" || props.feature.key === "fbs") {
    return <SegmentedField {...props} />;
  }
  return <SelectField {...props} />;
}

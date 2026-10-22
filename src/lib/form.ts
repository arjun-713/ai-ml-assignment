import { FEATURES, FEATURES_BY_KEY, REQUIRED_FEATURES } from "../data/features";
import type {
  FeatureKey,
  FieldErrors,
  FormValues,
  PatientFeatures,
} from "../types";

export function createEmptyForm(): FormValues {
  return Object.fromEntries(
    FEATURES.map((feature) => [feature.key, ""]),
  ) as FormValues;
}

export function validateForm(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};

  for (const feature of FEATURES) {
    const rawValue = values[feature.key]?.trim() ?? "";
    if (!rawValue) {
      if (feature.required) {
        errors[feature.key] =
          feature.inputType === "category"
            ? "Choose an option."
            : "Enter a value.";
      }
      continue;
    }

    if (feature.inputType === "category") {
      const allowed = feature.options?.map((option) => String(option.value)) ?? [];
      if (!allowed.includes(rawValue)) {
        errors[feature.key] = "Choose one of the listed options.";
      }
      continue;
    }

    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) {
      errors[feature.key] = "Enter a valid number.";
      continue;
    }
    if (feature.step === 1 && !Number.isInteger(numericValue)) {
      errors[feature.key] = "Use a whole number.";
      continue;
    }
    if (feature.min !== undefined && numericValue < feature.min) {
      errors[feature.key] = `Must be at least ${feature.min}${feature.unit ? ` ${feature.unit}` : ""}.`;
      continue;
    }
    if (feature.max !== undefined && numericValue > feature.max) {
      errors[feature.key] = `Must be at most ${feature.max}${feature.unit ? ` ${feature.unit}` : ""}.`;
    }
  }

  return errors;
}

export function toPayload(values: FormValues): PatientFeatures {
  const numberValue = (key: FeatureKey) => Number(values[key]);
  return {
    age: numberValue("age"),
    sex: numberValue("sex"),
    cp: numberValue("cp"),
    trestbps: numberValue("trestbps"),
    chol: numberValue("chol"),
    fbs: numberValue("fbs"),
    restecg: numberValue("restecg"),
    thalach: numberValue("thalach"),
    exang: numberValue("exang"),
    oldpeak: numberValue("oldpeak"),
    slope: numberValue("slope"),
    ca: values.ca.trim() === "" ? null : numberValue("ca"),
    thal: values.thal.trim() === "" ? null : numberValue("thal"),
  };
}

export function completedRequiredCount(values: FormValues): number {
  return REQUIRED_FEATURES.filter((feature) => values[feature.key]?.trim() !== "")
    .length;
}

export function isOutsideObservedRange(
  key: FeatureKey,
  rawValue: string,
): boolean {
  const feature = FEATURES_BY_KEY[key];
  if (feature.inputType !== "number" || rawValue.trim() === "") {
    return false;
  }
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return false;
  if (feature.observedMin !== undefined && value < feature.observedMin) {
    return true;
  }
  if (feature.observedMax !== undefined && value > feature.observedMax) {
    return true;
  }
  return false;
}

export function mergeFieldErrors(
  current: FieldErrors,
  next: FieldErrors,
): FieldErrors {
  return { ...current, ...next };
}

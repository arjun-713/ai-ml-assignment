import { FEATURES_BY_KEY, METRIC_LABELS } from "../data/features";
import type { FeatureKey, MetricKey } from "../types";

export function formatMetric(value: number, digits = 3): string {
  return value.toFixed(digits);
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatUnitPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function metricLabel(metric: MetricKey): string {
  return METRIC_LABELS[metric];
}

export function formatFeatureValue(
  key: FeatureKey,
  value: number | null | undefined,
): string {
  if (value === null || value === undefined) {
    return "Not recorded";
  }
  const feature = FEATURES_BY_KEY[key];
  const option = feature.options?.find((item) => item.value === value);
  if (option) return option.label;
  if (key === "oldpeak") return `${Number(value).toFixed(1)} mm`;
  if (feature.unit) return `${value} ${feature.unit}`;
  return String(value);
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatParameterName(key: string): string {
  const labels: Record<string, string> = {
    C: "Regularisation C",
    class_weight: "Class weight",
    max_depth: "Max depth",
    min_samples_leaf: "Min samples / leaf",
    n_estimators: "Trees",
    max_features: "Max features",
    criterion: "Criterion",
  };
  return labels[key] ?? key;
}

export function formatParameterValue(value: unknown): string {
  if (value === null) return "none";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function thresholdStatus(probability: number, threshold: number): string {
  return probability >= threshold ? "At or above threshold" : "Below threshold";
}

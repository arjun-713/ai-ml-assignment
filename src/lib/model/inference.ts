import bundleJson from "../../../artifacts/model_bundle.json";
import type { Contribution, PatientFeatures, PredictionResult } from "@/types";
import type {
  FeatureSchemaField,
  InferenceResult,
  ModelBundle,
} from "./types";

const bundle = bundleJson as unknown as ModelBundle;

export const MODEL_BUNDLE = bundle;

function sigmoid(value: number): number {
  if (value >= 0) {
    const exp = Math.exp(-value);
    return 1 / (1 + exp);
  }
  const exp = Math.exp(value);
  return exp / (1 + exp);
}

function isMissing(value: unknown): value is null | undefined {
  return value === null || value === undefined || Number.isNaN(value);
}

function featureSchemaByKey(): Record<string, FeatureSchemaField> {
  return Object.fromEntries(
    bundle.feature_schema.features.map((field) => [field.key, field]),
  );
}

const FEATURE_SCHEMA_BY_KEY = featureSchemaByKey();

function formatFeatureValue(key: string, value: number | null): string {
  if (value === null) return "Not recorded";
  const field = FEATURE_SCHEMA_BY_KEY[key];
  const option = field?.options?.find((item) => item.value === value);
  if (option) return option.label;
  if (field?.unit) return `${value} ${field.unit}`;
  return String(value);
}

function buildTransformedVector(features: PatientFeatures): {
  values: number[];
  sourceFeatures: string[];
  rawValues: Record<string, number | null>;
} {
  const { preprocessing } = bundle;
  const values: number[] = [];
  const sourceFeatures: string[] = [];
  const rawValues: Record<string, number | null> = {};

  for (let index = 0; index < preprocessing.numeric_features.length; index += 1) {
    const key = preprocessing.numeric_features[index] as keyof PatientFeatures;
    const raw = features[key];
    const missing = isMissing(raw);
    const value = missing ? preprocessing.numeric_impute[index] : Number(raw);
    rawValues[key] = missing ? null : value;
    values.push(
      (value - preprocessing.numeric_mean[index]) /
        preprocessing.numeric_scale[index],
    );
    sourceFeatures.push(key);
  }

  for (let index = 0; index < preprocessing.categorical_features.length; index += 1) {
    const key = preprocessing.categorical_features[index] as keyof PatientFeatures;
    const raw = features[key];
    const missing = isMissing(raw);
    const imputedValue = preprocessing.categorical_impute[index];
    const value = missing ? imputedValue : Number(raw);
    rawValues[key] = missing ? null : value;
    for (const category of preprocessing.categorical_categories[index]) {
      values.push(value === category ? 1 : 0);
      sourceFeatures.push(key);
    }
  }

  return { values, sourceFeatures, rawValues };
}

export function scoreFeatures(features: PatientFeatures): InferenceResult {
  const { values } = buildTransformedVector(features);
  const { classifier } = bundle;

  if (values.length !== classifier.coefficients.length) {
    throw new Error(
      `Model vector mismatch: ${values.length} transformed values vs ${classifier.coefficients.length} coefficients.`,
    );
  }

  let logOdds = classifier.intercept;
  for (let index = 0; index < values.length; index += 1) {
    logOdds += classifier.coefficients[index] * values[index];
  }

  const probability = sigmoid(logOdds);
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new Error("The model returned an invalid probability.");
  }

  return {
    prediction: probability >= bundle.model.threshold ? 1 : 0,
    probability,
    logOdds,
    transformed: values,
  };
}

function buildContributions(features: PatientFeatures): Contribution[] {
  const { values, sourceFeatures, rawValues } = buildTransformedVector(features);
  const { classifier } = bundle;

  interface Group {
    feature: string;
    label: string;
    value: string;
    contribution: number;
  }

  const grouped = new Map<string, Group>();
  for (let index = 0; index < values.length; index += 1) {
    const feature = sourceFeatures[index];
    const contribution = classifier.coefficients[index] * values[index];
    const existing = grouped.get(feature);
    if (!existing) {
      const field = FEATURE_SCHEMA_BY_KEY[feature];
      grouped.set(feature, {
        feature,
        label: field?.label ?? feature,
        value: formatFeatureValue(feature, rawValues[feature] ?? null),
        contribution: 0,
      });
    }

    const group = grouped.get(feature);
    if (group && Math.abs(contribution) > Math.abs(group.contribution)) {
      group.contribution = contribution;
    }
  }

  const maxStrength =
    Math.max(...Array.from(grouped.values(), (item) => Math.abs(item.contribution)), 0) ||
    1;

  return Array.from(grouped.values())
    .map((item) => {
      const rounded = Math.round(item.contribution * 1000) / 1000;
      return {
        feature: item.feature,
        label: item.label,
        value: item.value,
        log_odds_contribution: rounded,
        direction:
          item.contribution > 0
            ? ("toward_disease" as const)
            : ("toward_no_disease" as const),
        relative_strength:
          Math.round(
            Math.min(Math.abs(item.contribution) / maxStrength, 1) * 1000,
          ) / 1000,
      };
    })
    .sort(
      (left, right) =>
        Math.abs(right.log_odds_contribution) -
        Math.abs(left.log_odds_contribution),
    )
    .slice(0, 4);
}

export function predict(features: PatientFeatures): PredictionResult {
  const inference = scoreFeatures(features);
  const positive = inference.prediction === 1;
  const probability = Math.round(inference.probability * 10_000) / 10_000;

  return {
    prediction: inference.prediction,
    classification: positive
      ? "Disease pattern indicated"
      : "No disease pattern indicated",
    probability,
    probability_note:
      "This is the model's estimated probability for the disease-indicated class on the held-out Cleveland cohort. It is not a clinically calibrated risk and is not the chance of developing heart disease in the future.",
    threshold: bundle.model.threshold,
    model: {
      key: bundle.model.key,
      label: bundle.model.label,
      version: bundle.model.version,
      threshold: bundle.model.threshold,
    },
    contributions: buildContributions(features),
    explanation: positive
      ? "The model's estimated probability is at or above the 0.5 decision threshold, so it classifies this profile in the disease-indicated class. The input values should be reviewed alongside the contributing factors rather than treated as a diagnosis."
      : "The model's estimated probability is below the 0.5 decision threshold, so it classifies this profile in the no-disease class. A below-threshold score does not rule out coronary artery disease.",
    disclaimer: bundle.disclaimer,
    target_definition: bundle.target_definition,
  };
}

export function getModelInfo() {
  return bundle.model_info;
}

export function getHealth() {
  return {
    status: "ok" as const,
    model_loaded: true,
    model: bundle.model.label,
    version: bundle.model.version,
    detail: null,
  };
}

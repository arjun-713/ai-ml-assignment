import type {
  AssessmentRecord,
  PatientFeatures,
  PredictionResult,
} from "../types";

export const SAMPLE_INPUT: PatientFeatures = {
  age: 62,
  sex: 0,
  cp: 4,
  trestbps: 140,
  chol: 268,
  fbs: 0,
  restecg: 2,
  thalach: 160,
  exang: 0,
  oldpeak: 3.6,
  slope: 3,
  ca: null,
  thal: 3,
};

export function buildPredictionResult(
  overrides: Partial<PredictionResult> = {},
): PredictionResult {
  return {
    prediction: 1,
    classification: "Disease pattern indicated",
    probability: 0.699,
    probability_note:
      "This is the model's estimated probability for the disease-indicated class on the held-out Cleveland cohort. It is not a clinically calibrated risk.",
    threshold: 0.5,
    model: {
      key: "logistic_regression",
      label: "Logistic Regression",
      version: "1.0.0",
      threshold: 0.5,
    },
    contributions: [
      {
        feature: "cp",
        label: "Chest pain type",
        value: "Asymptomatic",
        log_odds_contribution: 1.16,
        direction: "toward_disease",
        relative_strength: 1,
      },
      {
        feature: "ca",
        label: "Major vessels coloured",
        value: "Not recorded",
        log_odds_contribution: -0.41,
        direction: "toward_no_disease",
        relative_strength: 0.35,
      },
    ],
    explanation:
      "The model's estimated probability is at or above the 0.5 decision threshold, so it classifies this profile in the disease-indicated class.",
    disclaimer:
      "Educational decision-support demo only. This output is not a medical diagnosis.",
    target_definition:
      "Original angiographic disease status (`num`): 0 = less than 50% diameter narrowing, 1–4 = greater than 50% narrowing in at least one major vessel.",
    ...overrides,
  };
}

export function buildAssessmentRecord(
  overrides: Partial<AssessmentRecord> = {},
): AssessmentRecord {
  return {
    input: SAMPLE_INPUT,
    result: buildPredictionResult(),
    submittedAt: "2026-10-22T10:30:00Z",
    ...overrides,
  };
}

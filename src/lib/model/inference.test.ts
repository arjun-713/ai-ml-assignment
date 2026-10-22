import { describe, expect, it } from "vitest";
import parity from "./__fixtures__/parity.json";
import { MODEL_BUNDLE, predict, scoreFeatures } from "./inference";
import type { PatientFeatures } from "@/types";

describe("TypeScript inference parity with scikit-learn", () => {
  it("matches the saved pipeline on every row of the Cleveland cohort", () => {
    expect(parity.rows).toHaveLength(303);
    expect(MODEL_BUNDLE.classifier.coefficients).toHaveLength(25);

    for (const row of parity.rows) {
      const input = row.input as unknown as PatientFeatures;
      const actual = scoreFeatures(input);
      expect(actual.probability).toBeCloseTo(row.probability, 9);
      expect(actual.logOdds).toBeCloseTo(row.log_odds, 8);
      expect(actual.prediction).toBe(row.probability >= parity.threshold ? 1 : 0);
    }
  });

  it("keeps missing optional values on the fitted imputation path", () => {
    const recorded = {
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
      ca: 2,
      thal: 3,
    } satisfies PatientFeatures;

    const missing = { ...recorded, ca: null, thal: null };
    const withValues = scoreFeatures(recorded);
    const withMissing = scoreFeatures(missing);

    expect(withValues.probability).not.toBeCloseTo(withMissing.probability, 4);
    expect(Number.isFinite(withMissing.probability)).toBe(true);
    expect(withMissing.prediction).toBe(withMissing.probability >= 0.5 ? 1 : 0);
  });

  it("returns bounded, sorted local contributions", () => {
    const result = predict({
      age: 63,
      sex: 1,
      cp: 4,
      trestbps: 145,
      chol: 233,
      fbs: 1,
      restecg: 2,
      thalach: 150,
      exang: 0,
      oldpeak: 2.3,
      slope: 3,
      ca: 0,
      thal: 6,
    });

    expect(result.prediction).toBe(1);
    expect(result.probability).toBeGreaterThan(0.5);
    expect(result.contributions.length).toBeGreaterThan(0);
    expect(result.contributions.length).toBeLessThanOrEqual(4);
    expect(new Set(result.contributions.map((item) => item.feature)).size).toBe(
      result.contributions.length,
    );
    expect(
      result.contributions.map((item) => Math.abs(item.log_odds_contribution)),
    ).toEqual(
      [...result.contributions]
        .sort(
          (left, right) =>
            Math.abs(right.log_odds_contribution) -
            Math.abs(left.log_odds_contribution),
        )
        .map((item) => Math.abs(item.log_odds_contribution)),
    );
    expect(Math.max(...result.contributions.map((item) => item.relative_strength))).toBe(1);
    for (const item of result.contributions) {
      expect(item.relative_strength).toBeGreaterThanOrEqual(0);
      expect(item.relative_strength).toBeLessThanOrEqual(1);
      expect(item.direction).toBe(
        item.log_odds_contribution > 0
          ? "toward_disease"
          : "toward_no_disease",
      );
    }
  });

  it("exposes the same model metadata as the training artifacts", () => {
    expect(MODEL_BUNDLE.model.key).toBe("logistic_regression");
    expect(MODEL_BUNDLE.model.label).toBe("Logistic Regression");
    expect(MODEL_BUNDLE.model.version).toBe("1.0.0");
    expect(MODEL_BUNDLE.model.threshold).toBe(0.5);
    expect(MODEL_BUNDLE.classifier.intercept).toBeCloseTo(-0.3241770657, 10);
    expect(MODEL_BUNDLE.model_info.test_metrics.roc_auc).toBeCloseTo(0.961, 3);
    expect(MODEL_BUNDLE.model_info.features).toHaveLength(13);
  });
});

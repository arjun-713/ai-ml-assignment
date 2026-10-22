import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatFeatureValue,
  formatMetric,
  formatParameterName,
  formatParameterValue,
  formatPercent,
  formatUnitPercent,
  metricLabel,
  thresholdStatus,
} from "./format";

describe("number formatting", () => {
  it("formats metrics and percentages at the documented precision", () => {
    expect(formatMetric(0.88144)).toBe("0.881");
    expect(formatMetric(0.9, 1)).toBe("0.9");
    expect(formatPercent(0.8299)).toBe("83.0%");
    expect(formatPercent(0.5, 0)).toBe("50%");
    expect(formatUnitPercent(0.7)).toBe("70%");
    expect(metricLabel("roc_auc")).toBe("ROC-AUC");
  });

  it("labels threshold decisions explicitly", () => {
    expect(thresholdStatus(0.5, 0.5)).toBe("At or above threshold");
    expect(thresholdStatus(0.499, 0.5)).toBe("Below threshold");
  });
});

describe("feature formatting", () => {
  it("uses the documented option labels", () => {
    expect(formatFeatureValue("sex", 0)).toBe("Female");
    expect(formatFeatureValue("cp", 4)).toBe("Asymptomatic");
    expect(formatFeatureValue("slope", 2)).toBe("Flat");
    expect(formatFeatureValue("thal", 6)).toBe("Fixed defect");
  });

  it("adds units and handles missing optional values", () => {
    expect(formatFeatureValue("age", 63)).toBe("63 years");
    expect(formatFeatureValue("oldpeak", 2)).toBe("2.0 mm");
    expect(formatFeatureValue("trestbps", 140)).toBe("140 mm Hg");
    expect(formatFeatureValue("ca", null)).toBe("Not recorded");
    expect(formatFeatureValue("thal", undefined)).toBe("Not recorded");
  });
});

describe("artifact formatting", () => {
  it("humanises hyperparameter names and values", () => {
    expect(formatParameterName("C")).toBe("Regularisation C");
    expect(formatParameterName("n_estimators")).toBe("Trees");
    expect(formatParameterName("custom")).toBe("custom");
    expect(formatParameterValue(null)).toBe("none");
    expect(formatParameterValue(0.1)).toBe("0.1");
    expect(formatParameterValue("balanced")).toBe("balanced");
    expect(formatParameterValue({ depth: 4 })).toBe('{"depth":4}');
  });

  it("formats ISO dates and returns unparseable input unchanged", () => {
    expect(formatDate("2026-10-22T10:30:00Z")).toContain("2026");
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

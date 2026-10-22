import { describe, expect, it } from "vitest";
import { FEATURE_KEYS, FEATURES, REQUIRED_FEATURES } from "../data/features";
import { SAMPLE_PRESETS } from "../data/presets";
import {
  completedRequiredCount,
  createEmptyForm,
  isOutsideObservedRange,
  mergeFieldErrors,
  toPayload,
  validateForm,
} from "./form";

const complete = SAMPLE_PRESETS[0].values;

describe("validateForm", () => {
  it("accepts a complete, valid record", () => {
    expect(validateForm(complete)).toEqual({});
  });

  it("requires every required field but not ca or thal", () => {
    const errors = validateForm(createEmptyForm());

    expect(Object.keys(errors)).toHaveLength(REQUIRED_FEATURES.length);
    expect(errors.ca).toBeUndefined();
    expect(errors.thal).toBeUndefined();
    expect(errors).toHaveProperty("age");
    expect(errors).toHaveProperty("cp");
  });

  it("rejects non-numeric and fractional whole-number fields", () => {
    expect(validateForm({ ...complete, age: "forty" }).age).toBe(
      "Enter a valid number.",
    );
    expect(validateForm({ ...complete, age: "41.5" }).age).toBe(
      "Use a whole number.",
    );
    expect(validateForm({ ...complete, oldpeak: "1.25" }).oldpeak).toBeUndefined();
  });

  it("enforces inclusive server-side bounds", () => {
    expect(validateForm({ ...complete, age: "17" }).age).toBe(
      "Must be at least 18 years.",
    );
    expect(validateForm({ ...complete, age: "101" }).age).toBe(
      "Must be at most 100 years.",
    );
    expect(validateForm({ ...complete, trestbps: "79" }).trestbps).toBe(
      "Must be at least 80 mm Hg.",
    );
    expect(validateForm({ ...complete, oldpeak: "-0.1" }).oldpeak).toBe(
      "Must be at least 0 mm.",
    );
  });

  it("rejects categorical values outside the documented UCI coding", () => {
    expect(validateForm({ ...complete, cp: "5" }).cp).toBe(
      "Choose one of the listed options.",
    );
    expect(validateForm({ ...complete, thal: "1" }).thal).toBe(
      "Choose one of the listed options.",
    );
  });
});

describe("toPayload", () => {
  it("converts strings to numbers and empty optional fields to null", () => {
    const payload = toPayload({ ...complete, ca: "", thal: "  " });

    expect(payload).toEqual({
      age: 41,
      sex: 0,
      cp: 2,
      trestbps: 130,
      chol: 204,
      fbs: 0,
      restecg: 2,
      thalach: 172,
      exang: 0,
      oldpeak: 1.4,
      slope: 1,
      ca: null,
      thal: null,
    });
  });

  it("keeps recorded optional values", () => {
    const payload = toPayload({ ...complete, ca: "2", thal: "7" });

    expect(payload.ca).toBe(2);
    expect(payload.thal).toBe(7);
  });
});

describe("form helpers", () => {
  it("creates a form containing all 13 keys", () => {
    const empty = createEmptyForm();

    expect(Object.keys(empty)).toEqual(FEATURE_KEYS);
    expect(Object.values(empty).every((value) => value === "")).toBe(true);
  });

  it("counts only completed required fields", () => {
    expect(completedRequiredCount(createEmptyForm())).toBe(0);
    expect(completedRequiredCount(complete)).toBe(REQUIRED_FEATURES.length);
    expect(completedRequiredCount({ ...complete, ca: "", thal: "" })).toBe(
      REQUIRED_FEATURES.length,
    );
    expect(completedRequiredCount({ ...complete, age: "" })).toBe(
      REQUIRED_FEATURES.length - 1,
    );
  });

  it("flags values outside the observed cohort range", () => {
    expect(isOutsideObservedRange("age", "78")).toBe(true);
    expect(isOutsideObservedRange("age", "77")).toBe(false);
    expect(isOutsideObservedRange("age", "not a number")).toBe(false);
    expect(isOutsideObservedRange("cp", "99")).toBe(false);
  });

  it("merges field errors without mutating the original record", () => {
    const current = { age: "Enter a value." };
    const merged = mergeFieldErrors(current, { cp: "Choose an option." });

    expect(merged).toEqual({
      age: "Enter a value.",
      cp: "Choose an option.",
    });
    expect(current).toEqual({ age: "Enter a value." });
  });
});

describe("feature definitions", () => {
  it("uses unique keys and valid required metadata", () => {
    expect(new Set(FEATURE_KEYS).size).toBe(FEATURES.length);
    expect(FEATURES).toHaveLength(13);
    for (const feature of FEATURES) {
      expect(feature.help.length).toBeGreaterThan(20);
      if (feature.inputType === "category") {
        expect(feature.options?.length).toBeGreaterThan(1);
      }
    }
  });
});

import { describe, expect, it } from "vitest";
import { FEATURES_BY_KEY, FEATURE_KEYS, REQUIRED_FEATURES } from "./features";
import { SAMPLE_PRESETS } from "./presets";
import { toPayload, validateForm } from "../lib/form";

describe("sample presets", () => {
  it("provides three complete, distinct UCI records", () => {
    expect(SAMPLE_PRESETS).toHaveLength(3);
    expect(new Set(SAMPLE_PRESETS.map((preset) => preset.id)).size).toBe(3);
    expect(new Set(SAMPLE_PRESETS.map((preset) => preset.name)).size).toBe(3);
  });

  it.each(SAMPLE_PRESETS)("keeps $id within the documented form contract", (preset) => {
    expect([...Object.keys(preset.values)].sort()).toEqual([...FEATURE_KEYS].sort());
    expect(validateForm(preset.values)).toEqual({});

    for (const feature of REQUIRED_FEATURES) {
      expect(preset.values[feature.key].trim()).not.toBe("");
    }

    for (const key of ["ca", "thal"] as const) {
      const allowed = FEATURES_BY_KEY[key].options?.map((option) =>
        String(option.value),
      );
      expect(allowed).toContain(preset.values[key]);
    }

    const payload = toPayload(preset.values);
    expect(Object.keys(payload)).toHaveLength(13);
    expect(Number.isFinite(payload.age)).toBe(true);
    expect(payload.ca).not.toBeNull();
    expect(payload.thal).not.toBeNull();
  });

  it("does not reveal the cohort outcome in the preset copy", () => {
    for (const preset of SAMPLE_PRESETS) {
      const copy = `${preset.name} ${preset.summary} ${preset.context}`.toLowerCase();
      expect(copy).not.toContain("disease");
      expect(copy).not.toContain("no disease");
    }
  });
});

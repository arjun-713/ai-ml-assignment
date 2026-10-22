// @vitest-environment node

import { describe, expect, it } from "vitest";
import { GET as health } from "../health/route";
import { GET as modelInfo } from "../model-info/route";
import { OPTIONS as predictOptions, POST as predict } from "./route";
import type { PredictionResult } from "@/types";

const VALID_PATIENT = {
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
};

async function post(body: unknown): Promise<Response> {
  return predict(
    new Request("http://localhost/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("Next.js API route handlers", () => {
  it("reports a loaded model from the health route", async () => {
    const response = await health();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      model_loaded: true,
      model: "Logistic Regression",
      version: "1.0.0",
      detail: null,
    });
  });

  it("serves model evidence from the committed bundle", async () => {
    const response = await modelInfo();

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.model.key).toBe("logistic_regression");
    expect(payload.validation.test_set_used_for_selection).toBe(false);
    expect(payload.test_metrics).toMatchObject({
      accuracy: 0.8852,
      precision: 0.8387,
      recall: 0.9286,
      f1: 0.8814,
      roc_auc: 0.961,
    });
    expect(payload.comparison).toHaveLength(3);
    expect(payload.confusion_matrix).toMatchObject({
      tn: 28,
      fp: 5,
      fn: 2,
      tp: 26,
    });
    expect(payload.dataset.n_rows).toBe(303);
    expect(payload.features).toHaveLength(13);
    expect(payload.features[0].key).toBe("age");
    expect(payload.limitations.length).toBeGreaterThanOrEqual(4);
    expect(payload.target_definition).toContain("angiographic");
  });

  it("scores a real profile with the exported sklearn parameters", async () => {
    const response = await post(VALID_PATIENT);

    expect(response.status).toBe(200);
    const payload = (await response.json()) as PredictionResult;
    expect(payload.prediction).toBe(1);
    expect(payload.probability).toBeGreaterThan(0.5);
    expect(payload.probability).toBeLessThanOrEqual(1);
    expect(payload.threshold).toBe(0.5);
    expect(payload.model.label).toBe("Logistic Regression");
    expect(payload.disclaimer).toContain("not a medical diagnosis");
    expect(payload.probability_note).toContain("future");
    expect(payload.contributions.length).toBeGreaterThan(0);
    expect(payload.contributions.length).toBeLessThanOrEqual(4);
  });

  it("produces different classes for the documented positive and negative records", async () => {
    const positive = (await (await post(VALID_PATIENT)).json()) as PredictionResult;
    const negative = (await (
      await post({
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
        ca: 0,
        thal: 3,
      })
    ).json()) as PredictionResult;

    expect(positive.prediction).toBe(1);
    expect(negative.prediction).toBe(0);
    expect(positive.probability).toBeGreaterThan(negative.probability);
  });

  it("accepts omitted or explicit-null optional fields identically", async () => {
    const omitted = { ...VALID_PATIENT, ca: undefined, thal: undefined };
    delete omitted.ca;
    delete omitted.thal;

    const omittedResponse = await post(omitted);
    const nullResponse = await post({ ...VALID_PATIENT, ca: null, thal: null });

    expect(omittedResponse.status).toBe(200);
    expect(nullResponse.status).toBe(200);
    expect(await omittedResponse.json()).toEqual(await nullResponse.json());
  });

  it("rejects an unknown field with a structured 422", async () => {
    const response = await post({ ...VALID_PATIENT, smoker: true });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.detail).toContain("invalid");
    expect(body.errors).toContainEqual({
      field: "smoker",
      message: "Unexpected field.",
      type: "unrecognized_keys",
    });
  });

  it("rejects out-of-range fields with the affected field name", async () => {
    const response = await post({ ...VALID_PATIENT, age: 101 });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.errors.some((error: { field: string }) => error.field === "age")).toBe(
      true,
    );
  });

  it("rejects a missing required feature", async () => {
    const incomplete = { ...VALID_PATIENT };
    delete (incomplete as { age?: number }).age;

    const response = await post(incomplete);

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.errors.map((error: { field: string }) => error.field)).toContain(
      "age",
    );
  });

  it("rejects malformed JSON with a 400", async () => {
    const response = await predict(
      new Request("http://localhost/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not-json",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      detail: "Request body must be valid JSON.",
    });
  });

  it("is deterministic and never caches a prediction", async () => {
    const first = await post(VALID_PATIENT);
    const second = await post(VALID_PATIENT);

    expect(first.headers.get("cache-control")).toBe("no-store");
    expect(await first.json()).toEqual(await second.json());
  });

  it("answers CORS preflight for deployed or external callers", async () => {
    const response = await predictOptions();

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toContain("POST");
  });
});

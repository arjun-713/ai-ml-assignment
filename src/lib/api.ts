import type {
  ApiFieldError,
  HealthStatus,
  ModelInfo,
  PatientFeatures,
  PredictionResult,
} from "../types";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
export const API_DOCS_URL = `${API_BASE}/docs`;

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(
    message: string,
    status = 0,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

interface ValidationPayload {
  detail?: string | Array<{ msg?: string }>;
  errors?: ApiFieldError[];
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
        ...options?.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        "The model route took too long to respond. Check the Next.js server, then try again.",
        0,
      );
    }
    throw new ApiError(
      "Cannot reach the model route. Check that the Next.js app is running and try again.",
      0,
    );
  } finally {
    window.clearTimeout(timeout);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const payload = (body ?? {}) as ValidationPayload;
    const fieldErrors: Record<string, string> = {};
    for (const item of payload.errors ?? []) {
      if (item.field) fieldErrors[item.field] = item.message;
    }
    let message =
      typeof payload.detail === "string"
        ? payload.detail
        : response.status === 503
          ? "The model is unavailable. Check the generated model bundle and restart the app."
          : "The request could not be completed.";
    if (response.status === 422 && Object.keys(fieldErrors).length > 0) {
      message = "Check the highlighted fields and try again.";
    }
    throw new ApiError(message, response.status, fieldErrors);
  }

  return body as T;
}

export function getHealth(): Promise<HealthStatus> {
  return request<HealthStatus>("/api/health");
}

export function getModelInfo(): Promise<ModelInfo> {
  return request<ModelInfo>("/api/model-info");
}

export function createPrediction(
  features: PatientFeatures,
): Promise<PredictionResult> {
  return request<PredictionResult>("/api/predict", {
    method: "POST",
    body: JSON.stringify(features),
  });
}

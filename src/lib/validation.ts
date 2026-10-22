import { z } from "zod";
import type { ApiFieldError, PatientFeatures } from "@/types";

function codedNumber(
  values: readonly number[],
  label: string,
): z.ZodType<number> {
  return z
    .number()
    .int()
    .refine((value) => values.includes(value), {
      message: `${label} must be one of: ${values.join(", ")}.`,
    });
}

/**
 * The 13-feature request contract. `ca` and `thal` are nullable/optional because
 * those are the only two fields with missing values in the training cohort.
 */
export const patientFeaturesSchema = z
  .object({
    age: z.number().int().min(18).max(100),
    sex: codedNumber([0, 1], "Sex"),
    cp: codedNumber([1, 2, 3, 4], "Chest pain type"),
    trestbps: z.number().int().min(80).max(250),
    chol: z.number().int().min(100).max(600),
    fbs: codedNumber([0, 1], "Fasting blood sugar"),
    restecg: codedNumber([0, 1, 2], "Resting ECG"),
    thalach: z.number().int().min(50).max(220),
    exang: codedNumber([0, 1], "Exercise-induced angina"),
    oldpeak: z.number().min(0).max(10),
    slope: codedNumber([1, 2, 3], "ST slope"),
    ca: codedNumber([0, 1, 2, 3], "Major vessels").nullable().optional(),
    thal: codedNumber([3, 6, 7], "Thallium scan").nullable().optional(),
  })
  .strict()
  .transform((value): PatientFeatures => ({
    ...value,
    ca: value.ca ?? null,
    thal: value.thal ?? null,
  }));

export function toFieldErrors(error: z.ZodError): ApiFieldError[] {
  const errors: ApiFieldError[] = [];
  for (const issue of error.issues) {
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) {
        errors.push({
          field: key,
          message: "Unexpected field.",
          type: "unrecognized_keys",
        });
      }
      continue;
    }

    errors.push({
      field: issue.path.map(String).join(".") || "body",
      message: issue.message,
      type: issue.code,
    });
  }
  return errors;
}

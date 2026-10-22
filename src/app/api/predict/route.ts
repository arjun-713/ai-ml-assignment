import { jsonResponse, optionsResponse } from "@/lib/http";
import { predict } from "@/lib/model/inference";
import { patientFeaturesSchema, toFieldErrors } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      { detail: "Request body must be valid JSON." },
      400,
    );
  }

  const parsed = patientFeaturesSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      {
        detail: "Some input values are invalid. Check the highlighted fields.",
        errors: toFieldErrors(parsed.error),
      },
      422,
    );
  }

  try {
    return jsonResponse(predict(parsed.data));
  } catch (error) {
    console.error("Prediction failed", error);
    return jsonResponse(
      { detail: "The model could not score this profile. Please try again." },
      500,
    );
  }
}

export async function OPTIONS() {
  return optionsResponse();
}

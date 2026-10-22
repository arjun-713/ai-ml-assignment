import { getHealth } from "@/lib/model/inference";
import { jsonResponse, optionsResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return jsonResponse(getHealth());
}

export async function OPTIONS() {
  return optionsResponse();
}

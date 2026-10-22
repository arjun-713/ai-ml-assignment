import type { Metadata } from "next";
import { InsightsPage } from "@/views/InsightsPage";

export const metadata: Metadata = {
  title: "Model insights",
  description:
    "Cross-validation, held-out evaluation, calibration and dataset evidence behind the served model.",
};

export default function Page() {
  return <InsightsPage />;
}

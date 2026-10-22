import type { Metadata } from "next";
import { PredictPage } from "@/views/PredictPage";

export const metadata: Metadata = {
  title: "New assessment",
  description:
    "Enter the 13 UCI Cleveland findings to run the trained heart-disease pattern model.",
};

export default function Page() {
  return <PredictPage />;
}

import type { Metadata } from "next";
import { ResultsPage } from "@/views/ResultsPage";

export const metadata: Metadata = {
  title: "Assessment result",
  description: "The latest in-memory model assessment for this session.",
};

export default function Page() {
  return <ResultsPage />;
}

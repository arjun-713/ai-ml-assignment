"use client";

import type { ReactNode } from "react";
import { AssessmentProvider } from "@/state/AssessmentContext";

export function Providers({ children }: { children: ReactNode }) {
  return <AssessmentProvider>{children}</AssessmentProvider>;
}

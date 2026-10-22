"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { AssessmentRecord } from "../types";

interface AssessmentContextValue {
  assessment: AssessmentRecord | null;
  setAssessment: (record: AssessmentRecord | null) => void;
}

const AssessmentContext = createContext<AssessmentContextValue | null>(null);

/**
 * Deliberately in-memory only. Patient feature values never enter localStorage,
 * sessionStorage, browser history state, or server-side storage.
 */
export function AssessmentProvider({
  children,
  initialAssessment = null,
}: {
  children: ReactNode;
  initialAssessment?: AssessmentRecord | null;
}) {
  const [assessment, setAssessment] = useState<AssessmentRecord | null>(
    initialAssessment,
  );
  return (
    <AssessmentContext.Provider value={{ assessment, setAssessment }}>
      {children}
    </AssessmentContext.Provider>
  );
}

export function useAssessment(): AssessmentContextValue {
  const context = useContext(AssessmentContext);
  if (!context) {
    throw new Error("useAssessment must be used inside AssessmentProvider");
  }
  return context;
}

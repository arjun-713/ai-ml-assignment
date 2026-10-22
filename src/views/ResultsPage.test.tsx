import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultsPage } from "./ResultsPage";
import { AssessmentProvider } from "../state/AssessmentContext";
import {
  buildAssessmentRecord,
  buildPredictionResult,
} from "../test/fixtures";
import type { AssessmentRecord } from "../types";

function renderResults(
  initialAssessment: AssessmentRecord | null = buildAssessmentRecord(),
) {
  return render(
    <AssessmentProvider initialAssessment={initialAssessment}>
      <ResultsPage />
    </AssessmentProvider>,
  );
}

describe("ResultsPage", () => {
  it("shows the positive classification, real probability and local factors", () => {
    renderResults();

    expect(
      screen.getByRole("heading", { name: /Assessment result/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Disease pattern/)).toBeInTheDocument();
    expect(screen.getByText("69.9")).toBeInTheDocument();
    expect(screen.getByText("At or above threshold")).toBeInTheDocument();
    expect(screen.getAllByText("Chest pain type").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Asymptomatic").length).toBeGreaterThan(0);
    expect(screen.getByText("Toward indicated")).toBeInTheDocument();
    expect(screen.getByText("Toward not indicated")).toBeInTheDocument();
    expect(screen.getByText(/Model used/)).toBeInTheDocument();
    expect(screen.getAllByText(/Logistic Regression/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Generated/)).toBeInTheDocument();
  });

  it("shows the input summary and imputation note for missing optional fields", () => {
    renderResults();

    expect(screen.getAllByText(/Major vessels coloured/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not recorded").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Missing vessels or thallium values are handled/),
    ).toBeInTheDocument();
  });

  it("renders a negative result with the below-threshold state", () => {
    renderResults(
      buildAssessmentRecord({
        result: buildPredictionResult({
          prediction: 0,
          classification: "No disease pattern indicated",
          probability: 0.0841,
          explanation:
            "The model's estimated probability is below the 0.5 decision threshold.",
          contributions: [
            {
              feature: "cp",
              label: "Chest pain type",
              value: "Atypical angina",
              log_odds_contribution: -0.9,
              direction: "toward_no_disease",
              relative_strength: 1,
            },
          ],
        }),
      }),
    );

    expect(screen.getByText(/No disease pattern/)).toBeInTheDocument();
    expect(screen.getByText("8.4")).toBeInTheDocument();
    expect(screen.getByText("Below threshold")).toBeInTheDocument();
    expect(screen.queryByText("Toward indicated")).not.toBeInTheDocument();
  });

  it("explains that a direct visit or reload has no active assessment", () => {
    renderResults(null);

    expect(
      screen.getByRole("heading", { name: /No active assessment/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/kept only in application memory/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /New assessment/i }),
    ).toHaveAttribute("href", "/predict");
  });

  it("labels model contributions as associations, not causes", () => {
    renderResults();

    expect(screen.getByText(/not causes/i)).toBeInTheDocument();
    expect(screen.getByText(/not a clinical probability/i)).toBeInTheDocument();
    expect(screen.getByText(/not saved/i)).toBeInTheDocument();
  });
});

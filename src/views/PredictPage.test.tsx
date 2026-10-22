import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PredictPage } from "./PredictPage";
import { AssessmentProvider } from "../state/AssessmentContext";
import { createPrediction, ApiError } from "../lib/api";
import { buildPredictionResult } from "../test/fixtures";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    createPrediction: vi.fn(),
  };
});

const mockedCreatePrediction = vi.mocked(createPrediction);

function renderPredictPage() {
  return render(
    <AssessmentProvider>
      <PredictPage />
    </AssessmentProvider>,
  );
}

async function submitForm() {
  const user = userEvent.setup();
  await user.click(
    screen.getAllByRole("button", { name: /Run assessment/i })[0],
  );
  return user;
}

describe("PredictPage", () => {
  beforeEach(() => {
    mockedCreatePrediction.mockReset();
    push.mockReset();
  });

  it("shows required-field errors instead of calling the API on an empty form", async () => {
    renderPredictPage();

    await submitForm();

    expect(
      await screen.findByText(
        /Please review the highlighted fields before running the assessment/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Enter a value.")).toHaveLength(5);
    expect(screen.getAllByText("Choose an option.")).toHaveLength(6);
    expect(mockedCreatePrediction).not.toHaveBeenCalled();
  });

  it("loads a real UCI preset into the form", async () => {
    const user = userEvent.setup();
    renderPredictPage();

    await user.click(
      screen.getByRole("button", { name: /Atypical chest pain/i }),
    );

    expect(screen.getByLabelText("Age")).toHaveValue(41);
    expect(screen.getByLabelText("Resting blood pressure")).toHaveValue(130);
    expect(
      screen.getByRole("button", { name: "Female", pressed: true }),
    ).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("submits the 13-feature payload and navigates to the result", async () => {
    mockedCreatePrediction.mockResolvedValue(buildPredictionResult());
    renderPredictPage();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: /Asymptomatic profile/i }),
    );
    await submitForm();

    await waitFor(() => expect(mockedCreatePrediction).toHaveBeenCalledTimes(1));
    expect(mockedCreatePrediction).toHaveBeenCalledWith({
      age: 62,
      sex: 0,
      cp: 4,
      trestbps: 140,
      chol: 268,
      fbs: 0,
      restecg: 2,
      thalach: 160,
      exang: 0,
      oldpeak: 3.6,
      slope: 3,
      ca: 2,
      thal: 3,
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/results"));
  });

  it("resets a loaded preset back to an empty form", async () => {
    const user = userEvent.setup();
    renderPredictPage();

    await user.click(
      screen.getByRole("button", { name: /Exercise-limited/i }),
    );
    expect(screen.getByLabelText("Age")).toHaveValue(67);

    await user.click(screen.getByRole("button", { name: /Reset/i }));

    expect(screen.getByLabelText("Age")).toHaveValue(null);
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(mockedCreatePrediction).not.toHaveBeenCalled();
  });

  it("surfaces server-side validation errors next to the affected field", async () => {
    mockedCreatePrediction.mockRejectedValue(
      new ApiError("Check the highlighted fields and try again.", 422, {
        age: "Input should be less than or equal to 100",
      }),
    );
    renderPredictPage();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: /Atypical chest pain/i }),
    );
    await user.click(
      screen.getAllByRole("button", { name: /Run assessment/i })[0],
    );

    expect(
      await screen.findByText(/Check the highlighted fields and try again/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Input should be less than or equal to 100"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /Run assessment/i })[0],
    ).toBeEnabled();
  });
});

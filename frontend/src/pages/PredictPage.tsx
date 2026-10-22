import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  LoaderCircle,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import clsx from "clsx";
import { FEATURES, FEATURE_GROUPS, FEATURES_BY_KEY, REQUIRED_FEATURES } from "../data/features";
import { SAMPLE_PRESETS, type SamplePreset } from "../data/presets";
import {
  completedRequiredCount,
  createEmptyForm,
  toPayload,
  validateForm,
} from "../lib/form";
import { ApiError, createPrediction } from "../lib/api";
import type {
  AssessmentRecord,
  FeatureKey,
  FieldErrors,
  FormValues,
} from "../types";
import { FeatureField } from "../components/FormFields";
import { InlineAlert } from "../components/Feedback";
import { useAssessment } from "../state/AssessmentContext";

function focusFirstError(errors: FieldErrors) {
  const firstKey = FEATURES.find((feature) => errors[feature.key])?.key;
  if (!firstKey) return;
  window.setTimeout(() => {
    const container = document.getElementById(`field-${firstKey}`);
    const control = container?.querySelector(
      "input, select, button",
    ) as HTMLElement | null;
    container?.scrollIntoView({ behavior: "smooth", block: "center" });
    control?.focus({ preventScroll: true });
  }, 80);
}

export function PredictPage() {
  const navigate = useNavigate();
  const { setAssessment } = useAssessment();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<FormValues>(createEmptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const completed = completedRequiredCount(values);
  const totalRequired = REQUIRED_FEATURES.length;
  const progress = Math.round((completed / totalRequired) * 100);

  const groups = useMemo(
    () =>
      FEATURE_GROUPS.map((group) => ({
        ...group,
        features: FEATURES.filter((feature) => feature.group === group.id),
      })),
    [],
  );

  function handleChange(key: FeatureKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setSelectedPreset(null);
    if (errors[key]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
    if (errorMessage) setErrorMessage(null);
  }

  function applyPreset(preset: SamplePreset) {
    setValues({ ...preset.values });
    setErrors({});
    setErrorMessage(null);
    setSelectedPreset(preset.id);
    window.setTimeout(() => {
      document
        .getElementById("assessment-start")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function resetForm() {
    setValues(createEmptyForm());
    setErrors({});
    setErrorMessage(null);
    setSelectedPreset(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const clientErrors = validateForm(values);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setErrorMessage("Please review the highlighted fields before running the assessment.");
      focusFirstError(clientErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const payload = toPayload(values);
      const result = await createPrediction(payload);
      const record: AssessmentRecord = {
        input: payload,
        result,
        submittedAt: new Date().toISOString(),
      };
      setAssessment(record);
      navigate("/results");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        const mapped: FieldErrors = {};
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field in FEATURES_BY_KEY) mapped[field as FeatureKey] = message;
        }
        if (Object.keys(mapped).length > 0) {
          setErrors(mapped);
          focusFirstError(mapped);
        }
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <header className="flex flex-col gap-5 border-b border-line/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="display text-[46px] leading-[0.94] text-ink sm:text-[54px]">
            New assessment<span className="text-coral-500">.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-muted">
            Thirteen findings from a cardiac examination, read by a trained model.
            It estimates disease presence at examination — not future heart-disease
            risk.
          </p>
        </div>
        <p className="shrink-0 text-[11.5px] leading-relaxed text-muted lg:text-right">
          UCI Cleveland · 303 records · 13 features
          <br />
          Logistic Regression · v1.0.0
        </p>
      </header>

      <section className="mt-5" aria-labelledby="presets-heading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="presets-heading"
            className="text-[13px] font-semibold text-ink"
          >
            Load a real record
          </h2>
          <p className="text-[11.5px] text-muted">
            Complete UCI records · no outcome precomputed
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {SAMPLE_PRESETS.map((preset) => {
            const active = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                aria-pressed={active}
                title={preset.context}
                className={clsx(
                  "group flex items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition duration-200",
                  active
                    ? "border-forest-600 bg-forest-50"
                    : "border-line bg-paper/65 hover:border-sage-400 hover:bg-paper",
                )}
              >
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-ink">
                    {preset.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-muted">
                    {preset.summary}
                  </span>
                </span>
                <span
                  className={clsx(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition",
                    active
                      ? "border-forest-700 bg-forest-700 text-paper"
                      : "border-line-strong text-muted group-hover:border-forest-400 group-hover:text-forest-600",
                  )}
                >
                  {active ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : (
                    <ArrowUpRight className="h-3 w-3" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <form
        ref={formRef}
        id="assessment-form"
        onSubmit={handleSubmit}
        noValidate
        aria-busy={submitting}
        className="mt-8"
      >
        <div
          id="assessment-start"
          className="flex scroll-mt-6 flex-wrap items-end justify-between gap-4"
        >
          <h2 className="display text-[32px] leading-none text-ink">
            Clinical findings
          </h2>
          <div className="w-full sm:w-72">
            <div className="flex items-center justify-between text-[11.5px] text-muted">
              <span>
                {completed} of {totalRequired} required
              </span>
              <span className="font-semibold tabular-nums text-ink-soft">
                {progress}%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sage-100">
              <div
                className="h-full rounded-full bg-forest-700 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4">
            <InlineAlert title="Assessment not completed">
              <p>{errorMessage}</p>
            </InlineAlert>
          </div>
        )}

        <div className="card mt-4 overflow-hidden">
          {groups.map((group, index) => (
            <section
              key={group.id}
              className={clsx("p-5 sm:p-7", index > 0 && "border-t border-line/80")}
              aria-labelledby={`group-${group.id}`}
            >
              <h3
                id={`group-${group.id}`}
                className="font-serif text-[26px] leading-none text-ink"
              >
                {group.title}
              </h3>
              <div
                className={clsx(
                  "mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2",
                  group.id === "patient"
                    ? "xl:grid-cols-2"
                    : "xl:grid-cols-4",
                )}
              >
                {group.features.map((feature) => (
                  <FeatureField
                    key={feature.key}
                    feature={feature}
                    value={values[feature.key]}
                    error={errors[feature.key]}
                    disabled={submitting}
                    onChange={handleChange}
                  />
                ))}
              </div>
            </section>
          ))}

          <div className="flex flex-col gap-4 border-t border-line/80 bg-paper-deep/35 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <p className="text-[13px] font-semibold text-ink">
                Ready when you are.
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                Inputs stay in this session and are never stored.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
                disabled={submitting}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    Run assessment
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-[11.5px] leading-relaxed text-muted sm:flex-row sm:items-start sm:justify-between">
          <p className="flex max-w-3xl items-start gap-2">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-700" />
            Academic machine-learning demonstration. Not a diagnosis or a
            future-risk estimate; consult a qualified clinician.
          </p>
          <Link
            to="/insights"
            className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-forest-700 transition hover:text-forest-900"
          >
            Model evidence
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </form>
    </div>
  );
}

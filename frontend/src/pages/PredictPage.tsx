import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ClipboardList,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  ScanLine,
  Sparkles,
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
  FeatureGroup,
  FeatureKey,
  FieldErrors,
  FormValues,
} from "../types";
import { FeatureField } from "../components/FormFields";
import { InlineAlert, MedicalDisclaimer } from "../components/Feedback";
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

function GroupProgress({
  group,
  values,
}: {
  group: FeatureGroup;
  values: FormValues;
}) {
  const fields = FEATURES.filter(
    (feature) => feature.group === group && feature.required,
  );
  const done = fields.filter((feature) => values[feature.key].trim() !== "").length;
  const complete = done === fields.length;
  return (
    <div className="flex items-center justify-between gap-2 text-[11.5px]">
      <span className={clsx("flex items-center gap-2", complete ? "text-forest-800" : "text-muted")}>
        <span
          className={clsx(
            "grid h-4 w-4 place-items-center rounded-full border",
            complete
              ? "border-forest-700 bg-forest-700 text-paper"
              : "border-line-strong bg-transparent",
          )}
        >
          {complete && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
        </span>
        {FEATURE_GROUPS.find((item) => item.id === group)?.title}
      </span>
      <span className="font-semibold tabular-nums text-muted">
        {done}/{fields.length}
      </span>
    </div>
  );
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

  const groupStats = useMemo(
    () =>
      FEATURE_GROUPS.map((group) => ({
        ...group,
        total: FEATURES.filter(
          (feature) => feature.group === group.id && feature.required,
        ).length,
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
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-end">
        <div>
          <p className="eyebrow">
            <span className="h-px w-7 bg-forest-500/60" />
            New assessment · Cleveland model
          </p>
          <h1 className="display mt-4 max-w-3xl text-[46px] leading-[0.94] text-ink sm:text-[58px] lg:text-[64px]">
            Cardiac signals,
            <br />
            <span className="italic text-forest-700">read with care.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[13.5px] leading-relaxed text-muted sm:text-sm">
            Enter 13 structured findings from a cardiac examination. The trained
            model classifies whether this profile resembles records with
            angiographic coronary artery disease in the UCI Cleveland cohort.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="pill">
              <ScanLine className="h-3 w-3 text-forest-600" />
              Presence at examination
            </span>
            <span className="pill">
              <Sparkles className="h-3 w-3 text-gold-500" />
              Not future risk
            </span>
            <span className="pill">UCI Cleveland · 303 records</span>
          </div>
        </div>

        <div className="hidden border-l border-line-strong/70 pl-6 lg:block">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-muted">
            What this is
          </p>
          <p className="mt-2.5 font-serif text-[23px] leading-[1.08] text-ink-soft">
            A statistical pattern read, not a prognosis.
          </p>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            The output reflects associations learned from a single historical
            cohort. It cannot confirm or exclude disease.
          </p>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="presets-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-3.5 w-3.5 text-forest-600" />
            <h2
              id="presets-heading"
              className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-ink-soft"
            >
              Start from a de-identified record
            </h2>
          </div>
          <p className="text-[10px] text-muted">Or complete the form manually below</p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {SAMPLE_PRESETS.map((preset, index) => {
            const active = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                aria-pressed={active}
                className={clsx(
                  "group relative rounded-2xl border p-3.5 text-left transition duration-200",
                  active
                    ? "border-forest-600 bg-forest-50 shadow-sm"
                    : "border-line bg-paper/75 hover:-translate-y-0.5 hover:border-sage-400 hover:bg-paper hover:shadow-card",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-muted">
                      Case {String(index + 1).padStart(2, "0")} · sample
                    </p>
                    <p className="mt-1 truncate font-serif text-[19px] leading-tight text-ink">
                      {preset.name}
                    </p>
                  </div>
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
                </div>
                <p className="mt-2 text-[11px] font-medium leading-relaxed text-ink-soft/80">
                  {preset.summary}
                </p>
                <p className="mt-1.5 text-[9.5px] text-muted">{preset.context}</p>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-muted/85">
          Values are copied exactly from complete records in{" "}
          <span className="font-mono text-[9.5px]">processed.cleveland.data</span>.
          No prediction or outcome is precomputed.
        </p>
      </section>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <form
          ref={formRef}
          id="assessment-form"
          onSubmit={handleSubmit}
          noValidate
          aria-busy={submitting}
          className="space-y-4"
        >
          <div id="assessment-start" className="scroll-mt-24">
            <p className="eyebrow">
              <span className="h-px w-6 bg-forest-500/60" />
              Clinical inputs
            </p>
            <h2 className="display mt-2 text-[32px] leading-tight text-ink">
              The 13 model features
            </h2>
          </div>

          {groupStats.map((group, index) => {
            const groupFeatures = FEATURES.filter(
              (feature) => feature.group === group.id,
            );
            return (
              <section
                key={group.id}
                className={clsx(
                  "card overflow-hidden animate-fade-up",
                  `stagger-${Math.min(index + 1, 4)}`,
                )}
                aria-labelledby={`group-${group.id}`}
              >
                <header className="flex items-start gap-4 border-b border-line/70 px-5 py-4 sm:px-6">
                  <span className="mt-0.5 font-serif text-[22px] leading-none text-forest-400">
                    {group.number}
                  </span>
                  <div className="min-w-0">
                    <h3
                      id={`group-${group.id}`}
                      className="font-serif text-[23px] leading-none text-ink"
                    >
                      {group.title}
                    </h3>
                    <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
                      {group.description}
                    </p>
                  </div>
                  <span className="ml-auto shrink-0 rounded-full border border-line bg-paper-deep px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted">
                    {groupFeatures.length} fields
                  </span>
                </header>
                <div className="grid gap-x-6 gap-y-5 px-5 py-5 sm:grid-cols-2 sm:px-6 sm:py-6">
                  {groupFeatures.map((feature) => (
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
            );
          })}

          {errorMessage && (
            <InlineAlert title="Assessment not completed">
              <p>{errorMessage}</p>
            </InlineAlert>
          )}

          <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="font-serif text-[23px] leading-tight text-ink">
                Run the trained pipeline
              </p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                Imputation, scaling, encoding and classification execute as one
                fitted pipeline. Nothing is stored after you leave this session.
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

          <MedicalDisclaimer />
        </form>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Assessment</p>
              <span className="text-[10px] font-bold tabular-nums text-muted">
                {progress}%
              </span>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="relative h-[62px] w-[62px] shrink-0">
                <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
                  <circle cx="32" cy="32" r="27" fill="none" stroke="#E5EDE5" strokeWidth="5" />
                  <circle
                    cx="32"
                    cy="32"
                    r="27"
                    fill="none"
                    stroke="#245244"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${progress * 1.696} 169.6`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center">
                  <span className="font-sans text-[17px] font-bold leading-none tabular-nums text-forest-900">
                    {completed}
                    <span className="text-[11px] font-semibold text-muted">
                      /{totalRequired}
                    </span>
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-ink">Required fields</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                  {completed === totalRequired
                    ? "Complete. Ready to run."
                    : `${totalRequired - completed} still needed. Vessels and thallium are optional.`}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2.5 border-t border-line/70 pt-4">
              {groupStats.map((group) => (
                <GroupProgress key={group.id} group={group.id} values={values} />
              ))}
            </div>
            <button
              type="submit"
              form="assessment-form"
              className="btn-primary mt-4 w-full"
              disabled={submitting}
            >
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

          <div className="card-quiet p-4">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-3.5 w-3.5 text-forest-600" />
              <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                Privacy by design
              </p>
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
              No names, identifiers or free-text notes are collected. Inputs exist
              only in browser memory and are sent solely to the local model API.
              Results are not saved.
            </p>
          </div>

          <div className="card-quiet p-4">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Under the hood
            </p>
            <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
              UCI Cleveland features → median / most-frequent imputation →
              standardisation → one-hot encoding → logistic regression. Every
              validation metric is published in Model Insights.
            </p>
            <Link to="/insights" className="btn-ghost mt-1 -ml-2">
              See the evidence
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

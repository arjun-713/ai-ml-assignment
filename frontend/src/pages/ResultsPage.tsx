import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Info,
  Printer,
  ShieldAlert,
  SlidersHorizontal,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import clsx from "clsx";
import type { AssessmentRecord, Contribution, FeatureKey } from "../types";
import { FEATURES_BY_KEY, FEATURE_GROUPS } from "../data/features";
import {
  formatDate,
  formatFeatureValue,
  formatPercent,
  thresholdStatus,
} from "../lib/format";
import { MedicalDisclaimer } from "../components/Feedback";
import { useAssessment } from "../state/AssessmentContext";

function ContributionBar({ item }: { item: Contribution }) {
  const towardDisease = item.direction === "toward_disease";
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-ink">{item.label}</p>
          <p className="mt-0.5 truncate text-[10.5px] text-muted">{item.value}</p>
        </div>
        <span
          className={clsx(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.08em]",
            towardDisease
              ? "bg-coral-50 text-coral-700"
              : "bg-forest-50 text-forest-700",
          )}
        >
          {towardDisease ? (
            <ArrowUpRight className="h-2.5 w-2.5" />
          ) : (
            <ArrowRight className="h-2.5 w-2.5 rotate-90" />
          )}
          {towardDisease ? "Toward indicated" : "Toward not indicated"}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sage-100">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-700",
            towardDisease ? "bg-coral-400" : "bg-forest-500",
          )}
          style={{ width: `${Math.max(item.relative_strength * 100, 2)}%` }}
        />
      </div>
    </div>
  );
}

function InputSummary({ record }: { record: AssessmentRecord }) {
  return (
    <div className="space-y-5">
      {FEATURE_GROUPS.map((group) => {
        const features = Object.entries(FEATURES_BY_KEY).filter(
          ([, feature]) => feature.group === group.id,
        );
        return (
          <div key={group.id}>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted">
              {group.title}
            </p>
            <dl className="mt-2.5 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {features.map(([key, feature]) => {
                const raw = record.input[key as FeatureKey];
                const value =
                  raw === null || raw === undefined
                    ? "Not recorded"
                    : formatFeatureValue(key as FeatureKey, raw);
                return (
                  <div
                    key={key}
                    className="flex items-baseline justify-between gap-3 border-b border-line/55 py-1.5"
                  >
                    <dt className="text-[10.5px] text-muted">{feature.label}</dt>
                    <dd className="text-right text-[11px] font-semibold text-ink">
                      {value}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        );
      })}
      {(record.input.ca === null || record.input.thal === null) && (
        <p className="text-[10px] leading-relaxed text-muted">
          Missing vessels or thallium values are handled by the imputers fitted
          inside the training pipeline.
        </p>
      )}
    </div>
  );
}

export function ResultsPage() {
  const { assessment: record } = useAssessment();

  if (!record?.result || !record.input) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-line bg-paper">
          <Stethoscope className="h-6 w-6 text-forest-600" />
        </div>
        <h1 className="display mt-5 text-4xl text-ink">No active assessment</h1>
        <p className="mx-auto mt-3 max-w-md text-[12.5px] leading-relaxed text-muted">
          Results are intentionally kept only in application memory for this
          session. Reloading the page clears them. Start a new assessment to run
          the trained model.
        </p>
        <Link to="/predict" className="btn-primary mt-6">
          New assessment
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const { result, submittedAt } = record;
  const positive = result.prediction === 1;
  const percent = result.probability * 100;

  return (
    <div>
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/predict"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted transition hover:text-forest-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            New assessment
          </Link>
          <h1 className="display mt-3 text-[42px] leading-none text-ink sm:text-[48px]">
            Assessment result
          </h1>
          <p className="mt-2 text-[11px] text-muted">
            Generated {formatDate(submittedAt)} · not saved
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-secondary"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
          <Link to="/predict" className="btn-primary">
            New assessment
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <section className="card mt-6 overflow-hidden animate-fade-up">
        <div className="grid lg:grid-cols-[1.35fr_1fr]">
          <div className="p-5 sm:p-8">
            <p className="eyebrow">
              <span
                className={clsx(
                  "h-1.5 w-1.5 rounded-full",
                  positive ? "bg-coral-500" : "bg-forest-600",
                )}
              />
              Model classification
            </p>
            <h2 className="display mt-3 text-[40px] leading-[0.98] text-ink sm:text-[52px]">
              {positive ? (
                <>
                  Disease pattern
                  <br />
                  <span className="italic text-coral-600">indicated.</span>
                </>
              ) : (
                <>
                  No disease pattern
                  <br />
                  <span className="italic text-forest-700">indicated.</span>
                </>
              )}
            </h2>
            <p className="mt-4 max-w-lg text-[12.5px] leading-relaxed text-muted">
              {result.explanation}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="pill">
                <CheckCircle2 className="h-3 w-3 text-forest-600" />
                Threshold {result.threshold.toFixed(2)}
              </span>
              <span className="pill">
                <SlidersHorizontal className="h-3 w-3 text-forest-600" />
                {result.model.label} v{result.model.version}
              </span>
              <span
                className={clsx(
                  "pill",
                  positive
                    ? "border-coral-200 bg-coral-50 text-coral-700"
                    : "border-sage-200 bg-forest-50 text-forest-700",
                )}
              >
                {thresholdStatus(result.probability, result.threshold)}
              </span>
            </div>

            <div className="mt-6 rounded-xl border border-line/80 bg-paper-deep/60 p-3.5">
              <div className="flex items-start gap-2.5">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest-600" />
                <p className="text-[10.5px] leading-relaxed text-muted">
                  <span className="font-semibold text-ink-soft">What the target means:
                  </span>{" "}
                  {result.target_definition}
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden border-t border-forest-800 bg-forest-950 p-5 text-paper sm:p-8 lg:border-l lg:border-t-0">
            <div
              className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-30 blur-3xl"
              style={{
                background: positive
                  ? "rgba(196,93,65,0.55)"
                  : "rgba(125,164,138,0.45)",
              }}
            />
            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between">
                <p className="eyebrow-light !text-[9px]">Model score</p>
                <span
                  className={clsx(
                    "grid h-8 w-8 place-items-center rounded-full border",
                    positive
                      ? "border-coral-400/40 bg-coral-500/15 text-coral-300"
                      : "border-sage-300/30 bg-sage-300/10 text-sage-200",
                  )}
                >
                  {positive ? (
                    <TriangleAlert className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                </span>
              </div>

              <div className="mt-7 flex items-start gap-1">
                <span className="font-serif text-[76px] leading-[0.8] tracking-[-0.03em] text-paper sm:text-[88px]">
                  {percent.toFixed(1)}
                </span>
                <span className="mt-1 font-serif text-[26px] text-sage-200/70">%</span>
              </div>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sage-200/75">
                Estimated probability · disease-indicated class
              </p>

              <div className="mt-7">
                <div className="relative h-2 rounded-full bg-white/10">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all duration-700",
                      positive ? "bg-coral-400" : "bg-sage-300",
                    )}
                    style={{ width: `${Math.max(percent, 1.5)}%` }}
                  />
                  <span
                    className="absolute -top-1 h-4 w-px bg-paper/70"
                    style={{ left: `${result.threshold * 100}%` }}
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[9px] tabular-nums text-sage-200/55">
                  <span>0</span>
                  <span>Decision threshold {formatPercent(result.threshold, 0)}</span>
                  <span>100</span>
                </div>
              </div>

              <p className="mt-auto pt-7 text-[10px] leading-relaxed text-sage-200/70">
                {result.probability_note}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <section className="card p-5 sm:p-6" aria-labelledby="factors-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Local explanation</p>
                <h2
                  id="factors-heading"
                  className="display mt-2 text-[29px] leading-none text-ink"
                >
                  Signals in this profile
                </h2>
              </div>
              <span className="rounded-full border border-line bg-paper-deep px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-muted">
                Logistic contributions
              </span>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              Each bar shows how one input shifted this model's log-odds for this
              person, scaled to the strongest local term. These are model
              associations for a linear classifier — not causes, and not medical
              risk factors in isolation.
            </p>
            <div className="mt-5 divide-y divide-line/70">
              {result.contributions.length > 0 ? (
                result.contributions.map((item) => (
                  <ContributionBar key={item.feature} item={item} />
                ))
              ) : (
                <p className="text-[11.5px] text-muted">
                  This model does not expose local linear contributions.
                </p>
              )}
            </div>
          </section>

          <section className="card p-5 sm:p-6" aria-labelledby="inputs-heading">
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-forest-600" />
              <h2
                id="inputs-heading"
                className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-soft"
              >
                Input summary
              </h2>
            </div>
            <div className="mt-5">
              <InputSummary record={record} />
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <p className="eyebrow">Model used</p>
            <p className="mt-2.5 font-serif text-[27px] leading-none text-ink">
              {result.model.label}
            </p>
            <p className="mt-1.5 text-[10.5px] text-muted">
              Version {result.model.version} · decision threshold{" "}
              {result.model.threshold.toFixed(2)}
            </p>
            <div className="mt-4 space-y-2 border-t border-line/70 pt-4 text-[10.5px] leading-relaxed text-muted">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-forest-600" />
                Selected by 5-fold cross-validation, before the holdout was opened.
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-forest-600" />
                Preprocessing and classifier served as one serialized pipeline.
              </p>
            </div>
            <Link
              to="/insights"
              className="btn-ghost mt-2 -ml-2"
            >
              Inspect the evidence
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-3.5 w-3.5 text-gold-700" />
              <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                How to read this
              </p>
            </div>
            <ul className="mt-3 space-y-2.5 text-[10.5px] leading-relaxed text-muted">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-forest-500" />
                The score is a thresholded model output for a historical cohort,
                not a clinical probability.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-forest-500" />
                A positive result can be a false positive; a negative result does
                not exclude disease.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-forest-500" />
                The held-out evaluation used only 61 patients, so uncertainty is
                substantial.
              </li>
            </ul>
          </div>

          <MedicalDisclaimer compact />

          <div className="rounded-xl border border-dashed border-line-strong px-4 py-3 text-[9.5px] leading-relaxed text-muted">
            Assessment data is not persisted. Leaving or reloading this page clears
            the result from memory.
          </div>
        </aside>
      </div>
    </div>
  );
}

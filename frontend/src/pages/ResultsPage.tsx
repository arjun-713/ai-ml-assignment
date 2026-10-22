import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Info,
  Printer,
  ShieldAlert,
  Stethoscope,
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
import { useAssessment } from "../state/AssessmentContext";

function ContributionBar({ item }: { item: Contribution }) {
  const towardDisease = item.direction === "toward_disease";
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink">{item.label}</p>
          <p className="mt-0.5 truncate text-[11.5px] text-muted">{item.value}</p>
        </div>
        <span
          className={clsx(
            "inline-flex shrink-0 items-center gap-1 text-[10.5px] font-semibold",
            towardDisease ? "text-coral-600" : "text-forest-600",
          )}
        >
          {towardDisease ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowRight className="h-3 w-3 rotate-90" />
          )}
          {towardDisease ? "Toward indicated" : "Toward not indicated"}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sage-100">
          <div
            className={clsx(
              "h-full rounded-full",
              towardDisease ? "bg-coral-400" : "bg-forest-500",
            )}
            style={{ width: `${Math.max(item.relative_strength * 100, 2)}%` }}
          />
        </div>
        <span
          className={clsx(
            "w-12 text-right text-[10.5px] font-semibold tabular-nums",
            towardDisease ? "text-coral-600" : "text-forest-600",
          )}
        >
          {item.log_odds_contribution > 0 ? "+" : ""}
          {item.log_odds_contribution.toFixed(2)}
        </span>
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
            <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted">
              {group.title}
            </p>
            <dl className="mt-2.5 grid gap-x-8 gap-y-2 sm:grid-cols-2">
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
                    <dt className="text-[12px] text-muted">{feature.label}</dt>
                    <dd className="text-right text-[12px] font-semibold text-ink">
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
        <p className="text-[11.5px] leading-relaxed text-muted">
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
        <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-muted">
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
      <header className="no-print flex flex-wrap items-end justify-between gap-4 border-b border-line/80 pb-5">
        <div>
          <h1 className="display text-[42px] leading-none text-ink sm:text-[48px]">
            Assessment result<span className="text-coral-500">.</span>
          </h1>
          <p className="mt-2 text-[11.5px] text-muted">
            Generated {formatDate(submittedAt)} · not saved · {result.model.label}{" "}
            v{result.model.version} · threshold {result.threshold.toFixed(2)}
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
      </header>

      <section className="mt-5 overflow-hidden rounded-card border border-line bg-paper animate-fade-up">
        <div className="grid lg:grid-cols-[1.45fr_1fr]">
          <div className="p-6 sm:p-8">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em] text-muted">
              <span
                className={clsx(
                  "h-1.5 w-1.5 rounded-full",
                  positive ? "bg-coral-500" : "bg-forest-600",
                )}
              />
              Model classification
            </p>
            <h2 className="display mt-3 text-[42px] leading-[0.98] text-ink sm:text-[54px]">
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
            <p className="mt-4 max-w-xl text-[13.5px] leading-relaxed text-muted">
              {result.explanation}
            </p>
            <div className="mt-5 flex items-start gap-2 rounded-lg bg-paper-deep/65 px-3.5 py-3 text-[11.5px] leading-relaxed text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest-600" />
              <p>
                <span className="font-semibold text-ink-soft">
                  Target definition:{" "}
                </span>
                {result.target_definition.replaceAll("`", "")}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden border-t border-forest-800 bg-forest-950 p-6 text-paper sm:p-8 lg:border-l lg:border-t-0">
            <div
              className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-25 blur-3xl"
              style={{
                background: positive
                  ? "rgba(196,93,65,0.55)"
                  : "rgba(125,164,138,0.45)",
              }}
            />
            <div className="relative flex h-full flex-col">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-sage-200/65">
                  Disease-pattern probability
                </p>
                <span
                  className={clsx(
                    "grid h-8 w-8 place-items-center rounded-full border",
                    positive
                      ? "border-coral-400/40 bg-coral-500/15 text-coral-300"
                      : "border-sage-300/30 bg-sage-300/10 text-sage-200",
                  )}
                >
                  {positive ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </span>
              </div>

              <div className="mt-7 flex items-start gap-1">
                <span className="font-serif text-[76px] leading-[0.8] tracking-[-0.03em] text-paper sm:text-[88px]">
                  {percent.toFixed(1)}
                </span>
                <span className="mt-1 font-serif text-[26px] text-sage-200/70">
                  %
                </span>
              </div>
              <p className="mt-2 text-[12px] font-semibold text-sage-100/85">
                {thresholdStatus(result.probability, result.threshold)}
              </p>

              <div className="mt-6">
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
                <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-sage-200/55">
                  <span>0</span>
                  <span>Threshold {formatPercent(result.threshold, 0)}</span>
                  <span>100</span>
                </div>
              </div>

              <p className="mt-auto pt-6 text-[11px] leading-relaxed text-sage-200/65">
                {result.probability_note}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.85fr)]">
        <div className="space-y-5">
          <section className="card p-5 sm:p-6" aria-labelledby="factors-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2
                  id="factors-heading"
                  className="display text-[30px] leading-none text-ink"
                >
                  Signals in this profile
                </h2>
                <p className="mt-2 max-w-2xl text-[11.5px] leading-relaxed text-muted">
                  Each bar is one input's local log-odds shift for this profile,
                  scaled to the strongest term.
                </p>
              </div>
              <span className="pill">Not causal</span>
            </div>
            <div className="mt-4 divide-y divide-line/70">
              {result.contributions.length > 0 ? (
                result.contributions.map((item) => (
                  <ContributionBar key={item.feature} item={item} />
                ))
              ) : (
                <p className="text-[12px] text-muted">
                  This model does not expose local linear contributions.
                </p>
              )}
            </div>
            <p className="mt-4 border-t border-line/70 pt-3 text-[11px] leading-relaxed text-muted">
              These are model associations for a linear classifier — not causes,
              and not medical risk factors in isolation.
            </p>
          </section>

          <details className="card group overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 text-[13px] font-semibold text-ink sm:p-6">
              Review the 13 inputs
              <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" />
            </summary>
            <div className="border-t border-line/80 p-5 sm:p-6">
              <InputSummary record={record} />
            </div>
          </details>
        </div>

        <aside className="space-y-4">
          <div className="card p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted">
              Model used
            </p>
            <p className="mt-2 font-serif text-[28px] leading-none text-ink">
              {result.model.label}
            </p>
            <p className="mt-1.5 text-[11.5px] text-muted">
              Version {result.model.version} · threshold{" "}
              {result.model.threshold.toFixed(2)}
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line/70 pt-4">
              <div>
                <dt className="text-[10.5px] uppercase tracking-[0.1em] text-muted">
                  Validation
                </dt>
                <dd className="mt-1 text-[12px] font-semibold text-ink-soft">
                  5-fold CV
                </dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-[0.1em] text-muted">
                  Holdout
                </dt>
                <dd className="mt-1 text-[12px] font-semibold text-ink-soft">
                  61 patients
                </dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-line/70 pt-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted">
                How to read this
              </p>
              <ul className="mt-2.5 space-y-2.5 text-[12px] leading-relaxed text-muted">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-forest-500" />
                  The score is a thresholded model output for a historical cohort,
                  not a clinical probability.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-forest-500" />
                  A positive can be a false positive; a negative does not exclude
                  disease.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-forest-500" />
                  The held-out evaluation used only 61 patients, so uncertainty is
                  substantial.
                </li>
              </ul>
            </div>

            <Link to="/insights" className="btn-ghost mt-3 -ml-3">
              Inspect the evidence
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="px-1 text-[11.5px] leading-relaxed text-muted">
            <p className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-700" />
              Academic machine-learning demonstration. Not a medical device or a
              future-risk estimate. Consult a qualified clinician.
            </p>
            <p className="mt-2 pl-5">
              Results stay in application memory and clear when you leave this page.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

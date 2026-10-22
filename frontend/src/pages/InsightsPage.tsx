import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Database,
  FlaskConical,
  Info,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  TriangleAlert,
} from "lucide-react";
import clsx from "clsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { API_DOCS_URL, getModelInfo } from "../lib/api";
import type { MetricKey, ModelInfo } from "../types";
import { METRIC_LABELS } from "../data/features";
import {
  formatMetric,
  formatParameterName,
  formatParameterValue,
  formatPercent,
  formatDate,
  formatUnitPercent,
} from "../lib/format";
import { InlineAlert, MedicalDisclaimer } from "../components/Feedback";

const METRIC_KEYS: MetricKey[] = ["accuracy", "precision", "recall", "f1", "roc_auc"];
const MODEL_COLORS: Record<string, string> = {
  logistic_regression: "#245244",
  random_forest: "#BE9750",
  decision_tree: "#C45D41",
};

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton h-14 w-full max-w-2xl" />
        <div className="skeleton h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="card p-5">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton mt-5 h-10 w-32" />
            <div className="skeleton mt-4 h-3 w-40" />
          </div>
        ))}
      </div>
      <div className="card p-6">
        <div className="skeleton h-5 w-48" />
        <div className="skeleton mt-6 h-72 w-full" />
      </div>
      <p className="flex items-center gap-2 text-[11px] text-muted">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        Loading trained-model artifacts…
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  accent = false,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div
      className={clsx(
        "card p-5",
        accent && "border-forest-700/40 bg-forest-950 text-paper",
      )}
    >
      <p
        className={clsx(
          "text-[9px] font-bold uppercase tracking-[0.16em]",
          accent ? "text-sage-200/60" : "text-muted",
        )}
      >
        {label}
      </p>
      <p
        className={clsx(
          "mt-3 font-serif text-[42px] leading-none tracking-tight",
          accent ? "text-paper" : "text-ink",
        )}
      >
        {value}
      </p>
      <p
        className={clsx(
          "mt-3 text-[10px] leading-relaxed",
          accent ? "text-sage-200/60" : "text-muted",
        )}
      >
        {note}
      </p>
    </div>
  );
}

function ModelComparisonSection({ info }: { info: ModelInfo }) {
  const chartData = METRIC_KEYS.map((metric) => {
    const row: Record<string, string | number> = {
      metric: METRIC_LABELS[metric],
    };
    for (const model of info.comparison) {
      row[model.key] = model.cv[metric].mean;
    }
    return row;
  });

  return (
    <section className="card overflow-hidden" aria-labelledby="comparison-heading">
      <div className="border-b border-line/70 px-5 py-5 sm:px-7">
        <p className="eyebrow">Model comparison</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="comparison-heading"
              className="display text-[32px] leading-none text-ink sm:text-[36px]"
            >
              Three models, one evaluation protocol
            </h2>
            <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-muted">
              Mean 5-fold cross-validation scores on the 242-patient training
              partition. Hyperparameters were tuned within each fold structure;
              the 61-patient holdout was not part of these numbers.
            </p>
          </div>
          <span className="pill">
            <Activity className="h-3 w-3 text-forest-600" />
            5-fold stratified CV
          </span>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div
          role="img"
          aria-label="Grouped bar chart comparing cross-validated accuracy, precision, recall, F1 and ROC-AUC for three models"
          className="min-w-0"
        >
          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 6, right: 4, bottom: 4, left: -18 }}
                barGap={2}
              >
                <CartesianGrid vertical={false} stroke="#E3E7DE" strokeDasharray="3 4" />
                <XAxis
                  dataKey="metric"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6A7872", fontSize: 9.5 }}
                  interval={0}
                />
                <YAxis
                  domain={[0, 1]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8A958F", fontSize: 9 }}
                  tickFormatter={(value: number) => value.toFixed(1)}
                />
                <Tooltip
                  cursor={{ fill: "rgba(36,82,68,0.045)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #DDE2D9",
                    fontSize: 11,
                    boxShadow: "0 12px 30px -18px rgba(9,40,33,0.4)",
                  }}
                  formatter={(value) => Number(value).toFixed(3)}
                />
                <Legend
                  verticalAlign="bottom"
                  height={30}
                  iconType="circle"
                  iconSize={6}
                  wrapperStyle={{ fontSize: 10, color: "#6A7872" }}
                />
                {info.comparison.map((model) => (
                  <Bar
                    key={model.key}
                    dataKey={model.key}
                    name={model.label}
                    fill={MODEL_COLORS[model.key] ?? "#98BCA9"}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={24}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0">
          <div className="overflow-x-auto rounded-xl border border-line/80">
            <table className="w-full min-w-[430px] border-collapse text-left text-[10.5px]">
              <caption className="sr-only">
                Cross-validated metrics for each candidate model
              </caption>
              <thead>
                <tr className="border-b border-line bg-paper-deep/80 text-[8.5px] uppercase tracking-[0.09em] text-muted">
                  <th className="px-3 py-2.5 font-bold">Model</th>
                  {METRIC_KEYS.map((metric) => (
                    <th key={metric} className="px-2 py-2.5 text-right font-bold">
                      {METRIC_LABELS[metric]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...info.comparison]
                  .sort((a, b) => a.rank - b.rank)
                  .map((model) => {
                    const selected = model.key === info.selection.selected_model_key;
                    return (
                      <tr
                        key={model.key}
                        className={clsx(
                          "border-b border-line/60 last:border-0",
                          selected ? "bg-forest-50/80" : "bg-paper",
                        )}
                      >
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <span className="flex items-center gap-1.5 font-semibold text-ink">
                            {selected && (
                              <CheckCircle2 className="h-3 w-3 text-forest-600" />
                            )}
                            {model.label}
                          </span>
                          <span className="text-[8.5px] text-muted">
                            rank {model.rank}
                          </span>
                        </td>
                        {METRIC_KEYS.map((metric) => (
                          <td
                            key={metric}
                            className="px-2 py-2.5 text-right tabular-nums"
                          >
                            <span
                              className={clsx(
                                "font-semibold",
                                selected ? "text-forest-800" : "text-ink-soft",
                              )}
                            >
                              {formatMetric(model.cv[metric].mean)}
                            </span>
                            <span className="block text-[8.5px] text-muted">
                              ±{formatMetric(model.cv[metric].std)}
                            </span>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[9.5px] leading-relaxed text-muted">
            Mean ± standard deviation across folds. Selection rank uses mean CV F1,
            with ROC-AUC as the tie-breaker.
          </p>
        </div>
      </div>
    </section>
  );
}

function ConfusionMatrixSection({ info }: { info: ModelInfo }) {
  const { tn, fp, fn, tp } = info.confusion_matrix;
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="confusion-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Classification</p>
          <h2
            id="confusion-heading"
            className="display mt-2 text-[28px] leading-none text-ink"
          >
            Confusion matrix
          </h2>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
          n = {tn + fp + fn + tp}
        </span>
      </div>
      <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
        Counts on the single held-out test partition at threshold{" "}
        {info.model.threshold.toFixed(2)}.
      </p>

      <table className="mt-5 w-full border-collapse overflow-hidden rounded-xl text-center">
        <caption className="sr-only">
          Confusion matrix of predicted versus actual disease status
        </caption>
        <thead>
          <tr>
            <th className="w-[86px]" />
            <th className="pb-2 text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted">
              Predicted no disease
            </th>
            <th className="pb-2 text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted">
              Predicted disease
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th className="pr-2 text-right text-[8.5px] font-bold uppercase tracking-[0.1em] leading-tight text-muted">
              Actual
              <br />
              no disease
            </th>
            <td className="border border-line bg-forest-50 p-4">
              <span className="font-serif text-3xl text-forest-900">{tn}</span>
              <span className="mt-0.5 block text-[8.5px] font-semibold uppercase tracking-wider text-forest-600">
                True negative
              </span>
            </td>
            <td className="border border-line bg-coral-50/60 p-4">
              <span className="font-serif text-3xl text-coral-600">{fp}</span>
              <span className="mt-0.5 block text-[8.5px] font-semibold uppercase tracking-wider text-coral-600/80">
                False positive
              </span>
            </td>
          </tr>
          <tr>
            <th className="pr-2 text-right text-[8.5px] font-bold uppercase tracking-[0.1em] leading-tight text-muted">
              Actual
              <br />
              disease
            </th>
            <td className="border border-line bg-coral-50/60 p-4">
              <span className="font-serif text-3xl text-coral-600">{fn}</span>
              <span className="mt-0.5 block text-[8.5px] font-semibold uppercase tracking-wider text-coral-600/80">
                False negative
              </span>
            </td>
            <td className="border border-line bg-forest-50 p-4">
              <span className="font-serif text-3xl text-forest-900">{tp}</span>
              <span className="mt-0.5 block text-[8.5px] font-semibold uppercase tracking-wider text-forest-600">
                True positive
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-[9.5px] leading-relaxed text-muted">
        Sensitivity for the disease class is {formatPercent(info.test_metrics.recall)}.
        Even here, {fn} patients with angiographic disease were missed and {fp} were
        flagged as disease-indicated.
      </p>
    </section>
  );
}

function ClassificationReport({ info }: { info: ModelInfo }) {
  const rows = [
    ["No disease", info.classification_report.no_disease],
    ["Disease", info.classification_report.disease],
    ["Macro average", info.classification_report.macro_avg],
  ] as const;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[340px] border-collapse text-left text-[10.5px]">
        <thead>
          <tr className="border-b border-line text-[8.5px] uppercase tracking-[0.1em] text-muted">
            <th className="py-2 pr-3 font-bold">Class</th>
            <th className="px-2 py-2 text-right font-bold">Precision</th>
            <th className="px-2 py-2 text-right font-bold">Recall</th>
            <th className="px-2 py-2 text-right font-bold">F1</th>
            <th className="py-2 pl-2 text-right font-bold">Support</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, row]) => (
            <tr key={label} className="border-b border-line/60 last:border-0">
              <td className="py-2.5 pr-3 font-semibold text-ink">{label}</td>
              <td className="px-2 py-2.5 text-right tabular-nums text-ink-soft">
                {formatMetric(row.precision)}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums text-ink-soft">
                {formatMetric(row.recall)}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums text-ink-soft">
                {formatMetric(row["f1-score"])}
              </td>
              <td className="py-2.5 pl-2 text-right tabular-nums text-muted">
                {row.support}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RocSection({ info }: { info: ModelInfo }) {
  const rocData = info.roc_curve.fpr.map((fpr, index) => ({
    fpr,
    tpr: info.roc_curve.tpr[index],
    chance: fpr,
  }));
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="roc-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Discrimination</p>
          <h2 id="roc-heading" className="display mt-2 text-[28px] leading-none text-ink">
            ROC curve
          </h2>
        </div>
        <span className="pill border-forest-200 bg-forest-50 text-forest-800">
          AUC {formatMetric(info.roc_curve.auc)}
        </span>
      </div>
      <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
        Threshold-free separation on the untouched test partition. The dashed line
        is chance.
      </p>
      <div
        className="mt-4 h-[250px] w-full"
        role="img"
        aria-label={`ROC curve with AUC ${formatMetric(info.roc_curve.auc)}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rocData} margin={{ top: 6, right: 8, bottom: 0, left: -22 }}>
            <CartesianGrid stroke="#E3E7DE" strokeDasharray="3 4" />
            <XAxis
              dataKey="fpr"
              type="number"
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(value: number) => value.toFixed(2)}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#8A958F", fontSize: 9 }}
              label={{
                value: "False positive rate",
                position: "insideBottom",
                offset: -2,
                fill: "#6A7872",
                fontSize: 9,
              }}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(value: number) => value.toFixed(2)}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#8A958F", fontSize: 9 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #DDE2D9",
                fontSize: 11,
              }}
              formatter={(value) => Number(value).toFixed(3)}
              labelFormatter={(value) => `FPR ${Number(value).toFixed(3)}`}
            />
            <Line
              type="monotone"
              dataKey="chance"
              name="Chance"
              stroke="#C8D1C7"
              strokeDasharray="4 4"
              strokeWidth={1.2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="tpr"
              name="Selected model"
              stroke="#245244"
              strokeWidth={2.4}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-[9px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded-full bg-forest-700" />
          Selected model
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-px w-5 border-t border-dashed border-line-strong" />
          Chance
        </span>
      </div>
    </section>
  );
}

function CalibrationSection({ info }: { info: ModelInfo }) {
  const calibrationData = info.calibration.mean_predicted.map((value, index) => ({
    predicted: value,
    observed: info.calibration.fraction_positive[index],
    ideal: value,
  }));
  return (
    <section className="card min-w-0 p-5 sm:p-6" aria-labelledby="calibration-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Probability quality</p>
          <h2
            id="calibration-heading"
            className="display mt-2 text-[28px] leading-none text-ink"
          >
            Calibration
          </h2>
        </div>
        <span className="pill">
          Brier {formatMetric(info.calibration.brier_score)}
        </span>
      </div>
      <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
        Predicted probability against observed disease frequency in six bins.
        With only {info.confusion_matrix.tn + info.confusion_matrix.fp + info.confusion_matrix.fn + info.confusion_matrix.tp} held-out
        patients, these points are noisy.
      </p>
      <div
        className="mt-4 h-[230px] w-full"
        role="img"
        aria-label="Calibration curve comparing predicted probabilities with observed disease fractions"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={calibrationData}
            margin={{ top: 6, right: 10, bottom: 0, left: -22 }}
          >
            <CartesianGrid stroke="#E3E7DE" strokeDasharray="3 4" />
            <XAxis
              dataKey="predicted"
              type="number"
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(value: number) => value.toFixed(2)}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#8A958F", fontSize: 9 }}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(value: number) => value.toFixed(2)}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#8A958F", fontSize: 9 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #DDE2D9",
                fontSize: 11,
              }}
              formatter={(value) => Number(value).toFixed(3)}
            />
            <Line
              type="linear"
              dataKey="ideal"
              name="Perfect calibration"
              stroke="#C8D1C7"
              strokeDasharray="4 4"
              dot={false}
              strokeWidth={1.2}
            />
            <Line
              type="linear"
              dataKey="observed"
              name="Observed"
              stroke="#C45D41"
              strokeWidth={2.2}
              dot={{ r: 3, fill: "#C45D41", strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-[9px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded-full bg-coral-500" />
          Observed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-px w-5 border-t border-dashed border-line-strong" />
          Perfect calibration
        </span>
      </div>
      <p className="mt-2 text-[9.5px] leading-relaxed text-muted">
        {info.calibration.note}
      </p>
    </section>
  );
}

function FeatureSignals({ info }: { info: ModelInfo }) {
  const importance = info.permutation_importance
    .filter((item) => item.mean_decrease_roc_auc > 0)
    .slice(0, 8);
  const maxImportance = Math.max(
    ...importance.map((item) => item.mean_decrease_roc_auc),
    0.001,
  );
  const [associationKey, setAssociationKey] = useState("cp");
  const associations = info.dataset.categorical_associations;
  const activeAssociation =
    associations.find((item) => item.feature === associationKey) ??
    associations[0];

  return (
    <section className="card overflow-hidden" aria-labelledby="features-heading">
      <div className="border-b border-line/70 px-5 py-5 sm:px-7">
        <p className="eyebrow">Feature analysis</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="features-heading"
              className="display text-[32px] leading-none text-ink sm:text-[36px]"
            >
              What carries the signal
            </h2>
            <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-muted">
              Permutation importance measures how much the selected pipeline's
              ROC-AUC drops when one input is shuffled on the holdout. Associations
              show raw cohort prevalence, not model weighting.
            </p>
          </div>
          <span className="pill">Held-out estimates</span>
        </div>
      </div>
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-gold-500" />
            <h3 className="text-[9px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Permutation importance · Δ ROC-AUC
            </h3>
          </div>
          <div className="mt-4 space-y-3">
            {importance.map((item, index) => (
              <div key={item.feature}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[10.5px] font-medium text-ink-soft">
                    <span className="mr-1.5 font-mono text-[8.5px] text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.label}
                  </span>
                  <span className="shrink-0 text-[9px] tabular-nums text-muted">
                    {formatMetric(item.mean_decrease_roc_auc)} ± {formatMetric(item.std)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sage-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-forest-500 to-forest-700"
                    style={{
                      width: `${Math.max(
                        (item.mean_decrease_roc_auc / maxImportance) * 100,
                        2,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[9.5px] leading-relaxed text-muted">
            Features with zero or negative measured importance are omitted; a
            negative value means shuffling did not reliably hurt this small test set.
            Importance is not causality.
          </p>
        </div>

        <div className="border-t border-line/70 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-3 w-3 text-forest-600" />
            <h3 className="text-[9px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Disease prevalence by finding
            </h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {associations.map((association) => (
              <button
                key={association.feature}
                type="button"
                onClick={() => setAssociationKey(association.feature)}
                className={clsx(
                  "rounded-full border px-2.5 py-1 text-[9px] font-semibold transition",
                  association.feature === activeAssociation.feature
                    ? "border-forest-700 bg-forest-900 text-paper"
                    : "border-line bg-paper text-muted hover:border-sage-400 hover:text-ink",
                )}
              >
                {association.label}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-2.5">
            {activeAssociation.groups.map((group) => (
              <div key={group.label}>
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-ink-soft">{group.label}</span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {group.disease_rate === null
                      ? "—"
                      : formatUnitPercent(group.disease_rate)}{" "}
                    <span className="text-[8.5px]">(n={group.n})</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sage-100">
                  <div
                    className="h-full rounded-full bg-coral-400/80"
                    style={{ width: `${(group.disease_rate ?? 0) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[9px] leading-relaxed text-muted">
            Unadjusted percentage of patients with angiographic disease in each
            category of the full 303-record cohort.
          </p>
        </div>
      </div>
    </section>
  );
}

function SelectionSection({ info }: { info: ModelInfo }) {
  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <div className="card p-5 sm:p-7">
        <p className="eyebrow">Model selection</p>
        <h2 className="display mt-2 text-[32px] leading-none text-ink sm:text-[36px]">
          Chosen before the holdout was opened
        </h2>
        <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
          {info.selection.rationale}
        </p>
        <div className="mt-5 space-y-2">
          {info.selection.rankings.map((ranking) => {
            const selected = ranking.rank === 1;
            return (
              <div
                key={ranking.model}
                className={clsx(
                  "rounded-xl border p-3.5",
                  selected
                    ? "border-forest-300 bg-forest-50/80"
                    : "border-line/80 bg-paper",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[11.5px] font-semibold text-ink">
                    <span
                      className={clsx(
                        "grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold",
                        selected
                          ? "bg-forest-800 text-paper"
                          : "bg-sage-100 text-muted",
                      )}
                    >
                      {ranking.rank}
                    </span>
                    {ranking.model}
                    {selected && (
                      <span className="rounded-full bg-forest-800 px-2 py-0.5 text-[7.5px] font-bold uppercase tracking-wider text-paper">
                        Selected
                      </span>
                    )}
                  </span>
                  <span className="flex gap-3 text-[9px] tabular-nums text-muted">
                    <span>F1 {formatMetric(ranking.cv_f1)}</span>
                    <span>Recall {formatMetric(ranking.cv_recall)}</span>
                    <span>AUC {formatMetric(ranking.cv_roc_auc)}</span>
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-sage-100">
                  <div
                    className={clsx(
                      "h-full rounded-full",
                      selected ? "bg-forest-700" : "bg-sage-300",
                    )}
                    style={{ width: `${ranking.cv_f1 * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[9.5px] leading-relaxed text-muted">
          {info.selection.selection_protocol}
        </p>
      </div>

      <div className="card p-5 sm:p-6">
        <p className="eyebrow">Selected estimator</p>
        <p className="mt-2 font-serif text-[31px] leading-none text-ink">
          {info.model.label}
        </p>
        <p className="mt-1.5 text-[10px] text-muted">
          Model version {info.model.version} · threshold{" "}
          {info.model.threshold.toFixed(2)}
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {Object.entries(info.model.hyperparameters).map(([key, value]) => (
            <span
              key={key}
              className="rounded-lg border border-line bg-paper-deep px-2 py-1 text-[8.5px] font-semibold text-ink-soft"
            >
              {formatParameterName(key)}: {formatParameterValue(value)}
            </span>
          ))}
        </div>
        <div className="mt-5 space-y-2.5 border-t border-line/70 pt-4">
          {[
            ["Validation split", `${info.validation.split}, seed ${info.validation.random_seed}`],
            ["Cross-validation", `${info.validation.cv_folds}-fold stratified, shuffled`],
            ["Selection rule", info.validation.selection_scoring],
            ["Test set used for selection", info.validation.test_set_used_for_selection ? "Yes" : "No"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 text-[10px]">
              <span className="text-muted">{label}</span>
              <span className="text-right font-semibold text-ink-soft">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-forest-200 bg-forest-50/60 p-3 text-[10px] leading-relaxed text-forest-800">
          <span className="font-bold">Why this matters:</span> the test partition
          was evaluated once, after this choice was locked. That keeps the reported
          test numbers an honest estimate rather than a selection score.
        </div>
        <div className="mt-3 rounded-xl border border-line/80 bg-paper-deep/60 p-3">
          <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted">
            Why a linear baseline
          </p>
          <p className="mt-1 text-[9.5px] leading-relaxed text-muted">
            With only 242 training patients, a regularised linear model has lower
            variance than a deep tree. It also exposes additive log-odds
            contributions, which power the local explanations on the results page.
          </p>
        </div>
      </div>
    </section>
  );
}

function DatasetSection({ info }: { info: ModelInfo }) {
  const total = info.dataset.binary_class_counts.no_disease + info.dataset.binary_class_counts.disease;
  const noDiseaseShare = info.dataset.binary_class_counts.no_disease / total;
  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="card p-5 sm:p-7">
        <p className="eyebrow">Cohort</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h2 className="display text-[32px] leading-none text-ink">
              Dataset at a glance
            </h2>
            <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
              UCI Heart Disease · Cleveland subset · 1988
            </p>
          </div>
          <p className="font-serif text-[48px] leading-none text-forest-800">
            {info.dataset.n_rows}
          </p>
        </div>

        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-coral-100">
          <div
            className="h-full bg-forest-700"
            style={{ width: `${noDiseaseShare * 100}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[9px] text-muted">
          <span>{info.dataset.binary_class_counts.no_disease} no disease</span>
          <span>{info.dataset.binary_class_counts.disease} disease indicated</span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            { label: "Features", value: info.dataset.n_features },
            {
              label: "Missing cells",
              value: Object.values(info.dataset.missing_values).reduce(
                (sum, value) => sum + value,
                0,
              ),
            },
            {
              label: "Test holdout",
              value:
                info.confusion_matrix.tn +
                info.confusion_matrix.fp +
                info.confusion_matrix.fn +
                info.confusion_matrix.tp,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-line/80 bg-paper-deep/70 p-2.5"
            >
              <p className="font-serif text-[24px] leading-none text-ink">
                {item.value}
              </p>
              <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.1em] text-muted">
                {item.label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[9.5px] leading-relaxed text-muted">
          {info.dataset_info.positive_class_definition}
        </p>
        <a
          href={info.dataset_info.source_url}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost mt-2 -ml-2"
        >
          UCI source archive
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>

      <div className="card p-5 sm:p-7">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5 text-gold-700" />
          <p className="eyebrow !text-gold-700">Limitations</p>
        </div>
        <h2 className="display mt-2 text-[32px] leading-none text-ink">
          What this evaluation cannot tell you
        </h2>
        <ol className="mt-4 space-y-3">
          {info.limitations.map((limitation, index) => (
            <li key={limitation} className="flex gap-3 text-[10.5px] leading-relaxed text-muted">
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-sage-100 font-mono text-[8px] font-bold text-forest-700">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{limitation}</span>
            </li>
          ))}
        </ol>
        <div className="mt-5 rounded-xl border border-line/80 bg-paper-deep/70 p-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
            Intended use
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-ink-soft/80">
            {info.intended_use}
          </p>
        </div>
      </div>
    </section>
  );
}

function ReproducibilitySection({ info }: { info: ModelInfo }) {
  return (
    <section className="card overflow-hidden bg-forest-950 text-paper">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="eyebrow-light">
            <FlaskConical className="h-3 w-3" />
            Reproducibility
          </p>
          <h2 className="display mt-2 text-[32px] leading-none text-paper sm:text-[36px]">
            Same seed. Same split. Same pipeline.
          </h2>
          <p className="mt-2 max-w-2xl text-[10.5px] leading-relaxed text-sage-200/60">
            The vendored UCI file is fingerprinted with SHA-256. Imputation, scaling
            and encoding are fitted inside each CV fold; the selected pipeline is
            serialized whole. Metrics on this page are read directly from the
            committed artifact generated at{" "}
            {formatDate(info.model.trained_at_utc)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:max-w-[360px] lg:justify-end">
          {[
            `seed ${info.validation.random_seed}`,
            "80/20 stratified",
            `${info.validation.cv_folds}-fold CV`,
            "no test leakage",
          ].map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[9px] font-semibold text-sage-100"
            >
              {item}
            </span>
          ))}
          <div className="mt-1 w-full rounded-xl border border-white/10 bg-black/15 px-3 py-2 font-mono text-[9px] text-sage-200/70 lg:text-right">
            python -m ml.train → artifacts/
          </div>
          <p
            className="w-full break-all text-[8px] font-mono text-sage-200/35 lg:text-right"
            title={info.dataset_info.sha256}
          >
            sha256:{info.dataset_info.sha256.slice(0, 32)}…
          </p>
        </div>
      </div>
    </section>
  );
}

export function InsightsPage() {
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getModelInfo()
      .then((result) => {
        if (!cancelled) {
          setInfo(result);
          setLoading(false);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "The model evidence could not be loaded.",
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const topImportance = useMemo(
    () =>
      info?.permutation_importance.find(
        (item) => item.mean_decrease_roc_auc > 0,
      )?.label ?? "—",
    [info],
  );

  if (loading) {
    return (
      <div>
        <p className="eyebrow">
          <span className="h-px w-7 bg-forest-500/60" />
          Model insights
        </p>
        <h1 className="display mt-4 text-[46px] leading-[0.95] text-ink sm:text-[58px]">
          Reading the evidence…
        </h1>
        <div className="mt-8">
          <LoadingState />
        </div>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-coral-200 bg-coral-50">
          <TriangleAlert className="h-6 w-6 text-coral-600" />
        </div>
        <h1 className="display mt-5 text-center text-4xl text-ink">
          Model evidence unavailable
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-[12px] leading-relaxed text-muted">
          {error ??
            "The API did not return the evaluation artifacts. Check that the backend is running and the model has been trained."}
        </p>
        <div className="mt-5">
          <InlineAlert title="Local setup check" tone="info">
            <p>
              From the repository root, run{" "}
              <code className="font-mono font-semibold">python -m ml.train</code>,
              start the API with{" "}
              <code className="font-mono font-semibold">
                uvicorn backend.main:app --port 8000
              </code>
              , then retry.
            </p>
          </InlineAlert>
        </div>
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setAttempt((current) => current + 1)}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
          <Link to="/predict" className="btn-secondary">
            Back to assessment
          </Link>
        </div>
      </div>
    );
  }

  const { selection, test_metrics: metrics } = info;
  const cvF1 = selection.selected_cv_scores.f1;

  return (
    <div>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
        <div>
          <p className="eyebrow">
            <span className="h-px w-7 bg-forest-500/60" />
            Model insights · artifacts v1.0
          </p>
          <h1 className="display mt-4 max-w-3xl text-[46px] leading-[0.94] text-ink sm:text-[58px] lg:text-[64px]">
            The evidence behind
            <br />
            <span className="italic text-forest-700">the estimate.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[13px] leading-relaxed text-muted sm:text-[13.5px]">
            Every figure below is read from the trained model's evaluation
            artifacts. Selection used cross-validation only; the 61-patient test
            partition was opened once for the final report.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-paper/80 p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-forest-900 text-paper">
              <Target className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[10px] font-bold text-ink">{info.model.label}</p>
              <p className="text-[8.5px] uppercase tracking-[0.12em] text-muted">
                Selected estimator · v{info.model.version}
              </p>
            </div>
          </div>
          <p className="mt-3 border-t border-line/70 pt-3 text-[9.5px] leading-relaxed text-muted">
            Trained {formatDate(info.model.trained_at_utc)} · {info.dataset.n_rows}{" "}
            records · 13 inputs
          </p>
        </div>
      </section>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Held-out ROC-AUC"
          value={formatMetric(metrics.roc_auc)}
          note="Discrimination on the untouched 61-patient test partition."
          accent
        />
        <MetricCard
          label="Held-out recall"
          value={formatPercent(metrics.recall)}
          note={`${info.confusion_matrix.tp} of ${info.confusion_matrix.tp + info.confusion_matrix.fn} disease-indicated test patients detected.`}
        />
        <MetricCard
          label="Held-out F1"
          value={formatMetric(metrics.f1)}
          note={`Balances precision ${formatPercent(metrics.precision)} against recall.`}
        />
        <MetricCard
          label="Cross-validated F1"
          value={formatMetric(cvF1.mean)}
          note={`Primary selection metric · SD ±${formatMetric(cvF1.std)} across ${info.validation.cv_folds} folds.`}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-line/80 bg-paper/60 px-4 py-2.5 text-[9.5px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-forest-600" />
          Top measured signal: <strong className="font-semibold text-ink-soft">{topImportance}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Info className="h-3 w-3 text-forest-600" />
          Test accuracy {formatPercent(metrics.accuracy)} · precision {formatPercent(metrics.precision)}
        </span>
        <Link
          to="/predict"
          className="ml-auto inline-flex items-center gap-1.5 font-semibold text-forest-700 hover:text-forest-900"
        >
          Run an assessment
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-5">
        <SelectionSection info={info} />
      </div>

      <div className="mt-5">
        <ModelComparisonSection info={info} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <RocSection info={info} />
        <ConfusionMatrixSection info={info} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <CalibrationSection info={info} />
        <section className="card min-w-0 p-5 sm:p-6" aria-labelledby="report-heading">
          <p className="eyebrow">Class-level detail</p>
          <h2
            id="report-heading"
            className="display mt-2 text-[28px] leading-none text-ink"
          >
            Classification report
          </h2>
          <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
            Precision, recall and F1 for each class on the holdout. Macro averages
            weight both classes equally.
          </p>
          <div className="mt-4">
            <ClassificationReport info={info} />
          </div>
          <div className="mt-4 space-y-2 border-t border-line/70 pt-4 text-[10px] leading-relaxed text-muted">
            <p>
              <span className="font-semibold text-ink-soft">Precision</span>{" "}
              {formatMetric(metrics.precision)}: when the model says disease, how
              often is that correct on this test set?
            </p>
            <p>
              <span className="font-semibold text-ink-soft">Recall</span>{" "}
              {formatMetric(metrics.recall)}: how many disease-indicated test
              patients the model found.
            </p>
            <p className="text-[9px]">
              Support values come from the {info.confusion_matrix.tn + info.confusion_matrix.fp + info.confusion_matrix.fn + info.confusion_matrix.tp}-patient
              stratified holdout.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-5">
        <FeatureSignals info={info} />
      </div>

      <div className="mt-5">
        <DatasetSection info={info} />
      </div>

      <div className="mt-5">
        <ReproducibilitySection info={info} />
      </div>

      <div className="mt-5">
        <MedicalDisclaimer />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[9.5px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Database className="h-3 w-3" />
          Artifacts generated {formatDate(info.model.trained_at_utc)}
        </span>
        <a
          href={API_DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 font-semibold text-forest-700 transition hover:text-forest-900"
        >
          API reference
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

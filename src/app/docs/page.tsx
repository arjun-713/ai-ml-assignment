import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Braces, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "API reference",
  description: "The Next.js route handlers exposed by the Cardia application.",
  robots: { index: false, follow: false },
};

const endpoints = [
  {
    method: "GET",
    path: "/api/health",
    summary: "Model route status",
    description: "Reports whether the committed model bundle is available.",
  },
  {
    method: "GET",
    path: "/api/model-info",
    summary: "Evaluation evidence",
    description:
      "Returns the schema, metadata, cross-validation results, holdout metrics and plots data used by the insights dashboard.",
  },
  {
    method: "POST",
    path: "/api/predict",
    summary: "Score one profile",
    description:
      "Accepts the 13 UCI Cleveland predictors, validates the contract, and returns a thresholded class, probability, model metadata and local linear contributions.",
  },
];

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/predict"
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-forest-700 transition hover:text-forest-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to assessment
      </Link>

      <header className="mt-5 border-b border-line/80 pb-6">
        <p className="eyebrow">
          <Braces className="h-3.5 w-3.5" />
          Internal API reference
        </p>
        <h1 className="display mt-3 text-[46px] leading-[0.95] text-ink sm:text-[54px]">
          One app, three routes<span className="text-coral-500">.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-muted">
          The model runs inside Next.js route handlers on the Node.js runtime.
          There is no separate Python server, database, or authentication layer.
          Validation happens at the route boundary with the same 13-field
          contract the form uses.
        </p>
      </header>

      <section className="mt-5 space-y-3">
        {endpoints.map((endpoint) => (
          <div key={endpoint.path} className="card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-forest-900 px-2 py-1 font-mono text-[10px] font-bold text-paper">
                {endpoint.method}
              </span>
              <code className="font-mono text-[12.5px] font-semibold text-ink">
                {endpoint.path}
              </code>
              <span className="text-[11px] text-muted">· {endpoint.summary}</span>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">
              {endpoint.description}
            </p>
          </div>
        ))}
      </section>

      <section className="card mt-5 overflow-hidden">
        <div className="border-b border-line/80 p-5">
          <h2 className="font-serif text-[27px] leading-none text-ink">
            Prediction example
          </h2>
          <p className="mt-2 text-[12px] text-muted">
            The optional <code className="font-mono">ca</code> and{" "}
            <code className="font-mono">thal</code> fields may be omitted or set
            to <code className="font-mono">null</code>.
          </p>
        </div>
        <pre className="overflow-x-auto bg-forest-950 p-5 text-[11.5px] leading-relaxed text-sage-100">
          <code>{`curl -s http://localhost:3000/api/predict \\
  -H 'Content-Type: application/json' \\
  -d '{
    "age": 63, "sex": 1, "cp": 4, "trestbps": 145, "chol": 233,
    "fbs": 1, "restecg": 2, "thalach": 150, "exang": 0,
    "oldpeak": 2.3, "slope": 3, "ca": 0, "thal": 6
  }'`}</code>
        </pre>
      </section>

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-gold-300/60 bg-gold-100/40 p-4 text-[11.5px] leading-relaxed text-muted">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-700" />
        <p>
          This API is an academic demonstration, not a medical device. It
          estimates disease presence in the historical cohort at examination,
          not future heart-disease risk. Do not use it for patient care.
        </p>
      </div>
    </div>
  );
}

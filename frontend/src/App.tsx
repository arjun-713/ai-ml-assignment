import { lazy, Suspense } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Layout } from "./components/Layout";
import { PredictPage } from "./pages/PredictPage";
import { ResultsPage } from "./pages/ResultsPage";
import { AssessmentProvider } from "./state/AssessmentContext";

const InsightsPage = lazy(() =>
  import("./pages/InsightsPage").then((module) => ({
    default: module.InsightsPage,
  })),
);

function InsightsFallback() {
  return (
    <div>
      <p className="eyebrow">
        <span className="h-px w-7 bg-forest-500/60" />
        Model insights
      </p>
      <div className="skeleton mt-4 h-16 w-full max-w-2xl" />
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="card p-5">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton mt-5 h-10 w-28" />
          </div>
        ))}
      </div>
      <p className="mt-6 text-[11px] text-muted">Loading evaluation charts…</p>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="eyebrow justify-center">404</p>
      <h1 className="display mt-3 text-5xl text-ink">Page not found</h1>
      <p className="mt-3 text-[12px] text-muted">
        The page you requested does not exist in this workspace.
      </p>
      <Link to="/predict" className="btn-primary mt-6">
        Return to assessment
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <AssessmentProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/predict" replace />} />
          <Route path="/predict" element={<PredictPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route
            path="/insights"
            element={
              <Suspense fallback={<InsightsFallback />}>
                <InsightsPage />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AssessmentProvider>
  );
}

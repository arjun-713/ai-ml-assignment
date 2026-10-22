import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import clsx from "clsx";
import { API_DOCS_URL, getHealth } from "../lib/api";
import type { HealthStatus } from "../types";

export function ApiStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const result = await getHealth();
        if (!cancelled) {
          setHealth(result);
          setUnreachable(false);
        }
      } catch {
        if (!cancelled) {
          setHealth(null);
          setUnreachable(true);
        }
      }
    }

    void check();
    const timer = window.setInterval(check, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const online = health?.status === "ok" && health.model_loaded;
  const label = online ? "Live model" : unreachable ? "Service offline" : "Connecting";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-sage-200/70">
          <span className="relative flex h-2 w-2">
            {online && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-50" />
            )}
            <span
              className={clsx(
                "relative inline-flex h-2 w-2 rounded-full",
                online
                  ? "bg-emerald-300"
                  : unreachable
                    ? "bg-coral-400"
                    : "bg-gold-300",
              )}
            />
          </span>
          {label}
        </span>
        <a
          href={API_DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className="text-sage-200/55 transition hover:text-paper"
          aria-label="Open API documentation"
          title="Open API documentation"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <p className="mt-2 truncate text-[12px] font-semibold text-paper">
        {online ? health.model : unreachable ? "Backend not reached" : "Checking backend"}
      </p>
      <p className="mt-0.5 text-[10.5px] leading-relaxed text-sage-200/55">
        {online
          ? `v${health.version} · trained pipeline`
          : unreachable
            ? "Start uvicorn on port 8000"
            : "Verifying model artifacts"}
      </p>
    </div>
  );
}

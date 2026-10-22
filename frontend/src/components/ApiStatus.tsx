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
  const label = online ? "Model online" : unreachable ? "Service offline" : "Connecting";

  return (
    <div className="border-t border-white/10 px-1 pt-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[11px] font-semibold text-sage-100">
          <span className="relative flex h-1.5 w-1.5">
            {online && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-50" />
            )}
            <span
              className={clsx(
                "relative inline-flex h-1.5 w-1.5 rounded-full",
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
          className="text-sage-200/45 transition hover:text-paper"
          aria-label="Open API documentation"
          title="Open API documentation"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <p className="mt-1.5 truncate text-[11px] leading-relaxed text-sage-200/45">
        {online
          ? `${health.model} · v${health.version}`
          : unreachable
            ? "Start uvicorn on port 8000"
            : "Checking the local API"}
      </p>
    </div>
  );
}

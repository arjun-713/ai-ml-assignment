import { AlertTriangle, Info } from "lucide-react";
import clsx from "clsx";
import type { ReactNode } from "react";

export function InlineAlert({
  title,
  children,
  tone = "error",
}: {
  title: string;
  children?: ReactNode;
  tone?: "error" | "info";
}) {
  const Icon = tone === "error" ? AlertTriangle : Info;
  return (
    <div
      className={clsx(
        "flex gap-3 rounded-2xl border p-4 text-[12.5px] leading-relaxed",
        tone === "error"
          ? "border-coral-200 bg-coral-50 text-coral-700"
          : "border-sage-200 bg-forest-50 text-forest-800",
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-bold">{title}</p>
        {children && <div className="mt-1 opacity-90">{children}</div>}
      </div>
    </div>
  );
}

export function InfoNote({
  children,
  className,
  icon = true,
}: {
  children: ReactNode;
  className?: string;
  icon?: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex gap-2.5 rounded-xl border border-line/80 bg-paper-deep/70 px-3.5 py-3 text-[11.5px] leading-relaxed text-muted",
        className,
      )}
    >
      {icon && <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest-600" />}
      <div>{children}</div>
    </div>
  );
}

export function MedicalDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-gold-300/50 bg-gold-100/35",
        compact ? "p-3.5" : "p-4",
      )}
    >
      <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-gold-700">
        Medical disclaimer
      </p>
      <p
        className={clsx(
          "mt-1.5 leading-relaxed text-ink-soft/75",
          compact ? "text-[10.5px]" : "text-[11.5px]",
        )}
      >
        This is an academic machine-learning demonstration, not a medical device.
        It does not diagnose coronary artery disease, rule it out, or estimate
        future heart-disease risk. Always consult a qualified clinician.
      </p>
    </div>
  );
}

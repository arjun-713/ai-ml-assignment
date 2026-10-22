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
        "flex gap-3 rounded-xl border p-4 text-[13px] leading-relaxed",
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

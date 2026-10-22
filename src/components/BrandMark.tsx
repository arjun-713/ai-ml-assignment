import clsx from "clsx";

interface BrandMarkProps {
  tone?: "light" | "dark";
  size?: "sm" | "md";
}

export function BrandMark({ tone = "light", size = "md" }: BrandMarkProps) {
  return (
    <span
      className={clsx(
        "grid shrink-0 place-items-center rounded-[12px] shadow-sm",
        size === "md" ? "h-10 w-10" : "h-8 w-8",
        tone === "dark"
          ? "bg-paper text-forest-950 ring-1 ring-white/20"
          : "bg-forest-950 text-paper",
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 40 40"
        className={size === "md" ? "h-6 w-6" : "h-5 w-5"}
        fill="none"
      >
        <path
          d="M4 21h7.2l3.1-7.4 5.3 15 3.5-9.6 2.3 4.1H36"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="34" cy="23.1" r="1.8" fill="#C45D41" />
      </svg>
    </span>
  );
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="flex flex-col leading-none">
      <span
        className={clsx(
          "font-serif text-[27px] tracking-[-0.02em]",
          light ? "text-paper" : "text-ink",
        )}
      >
        cardia<span className="text-coral-500">.</span>
      </span>
      <span
        className={clsx(
          "mt-1 text-[8.5px] font-bold uppercase tracking-[0.22em]",
          light ? "text-sage-200/70" : "text-muted",
        )}
      >
        Cardiac ML workspace
      </span>
    </span>
  );
}

import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Activity, ShieldCheck, Stethoscope } from "lucide-react";
import clsx from "clsx";
import { BrandMark, Wordmark } from "./BrandMark";
import { ApiStatus } from "./ApiStatus";

const navItems = [
  {
    to: "/predict",
    label: "New assessment",
    hint: "Enter patient findings",
    icon: Stethoscope,
  },
  {
    to: "/insights",
    label: "Model insights",
    hint: "Evaluation & evidence",
    icon: Activity,
  },
];

function isNavActive(to: string, pathname: string): boolean {
  return pathname === to || (to === "/predict" && pathname === "/results");
}

function SidebarNav() {
  const { pathname } = useLocation();
  return (
    <nav className="mt-3 space-y-1.5" aria-label="Main navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isNavActive(item.to, pathname);
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "group flex items-center gap-3 rounded-xl border px-3.5 py-3 transition duration-200",
              active
                ? "border-white/10 bg-white/[0.085] text-paper shadow-sm"
                : "border-transparent text-sage-200/65 hover:bg-white/[0.045] hover:text-paper",
            )}
          >
            <Icon
              className={clsx(
                "h-[18px] w-[18px] shrink-0 transition",
                active ? "text-gold-300" : "text-sage-300/70",
              )}
              strokeWidth={1.8}
            />
            <span className="min-w-0">
              <span className="block text-[12.5px] font-semibold leading-tight">
                {item.label}
              </span>
              <span className="mt-0.5 block text-[10px] leading-tight text-sage-200/45">
                {item.hint}
              </span>
            </span>
            {active && (
              <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-coral-400" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNav() {
  const { pathname } = useLocation();
  return (
    <nav className="flex gap-1.5 px-4 pb-3" aria-label="Main navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isNavActive(item.to, pathname);
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-semibold transition",
              active
                ? "border-forest-900 bg-forest-900 text-paper"
                : "border-line bg-paper/60 text-ink-soft",
            )}
          >
            <Icon
              className={clsx("h-3.5 w-3.5", active ? "text-gold-300" : "text-forest-600")}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Layout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col overflow-hidden bg-forest-950 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 6%, rgba(190,151,80,0.5), transparent 34%), radial-gradient(circle at 88% 74%, rgba(125,164,138,0.45), transparent 40%)",
          }}
        />
        <svg
          viewBox="0 0 272 900"
          className="pointer-events-none absolute inset-y-0 left-0 h-full w-full opacity-[0.055]"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M-20 410h75l23-57 37 143 31-88 24 37h122"
            fill="none"
            stroke="#F2F0E9"
            strokeWidth="2"
          />
          <path
            d="M-20 700h48l30-33 27 71 41-127 29 89h117"
            fill="none"
            stroke="#F2F0E9"
            strokeWidth="1.3"
          />
        </svg>

        <div className="relative flex h-full flex-col px-5 pb-5 pt-6">
          <Link to="/predict" className="flex items-center gap-3 px-1">
            <BrandMark tone="dark" />
            <Wordmark light />
          </Link>

          <div className="mt-10">
            <p className="px-2 text-[9px] font-bold uppercase tracking-[0.22em] text-sage-200/35">
              Workspace
            </p>
            <SidebarNav />
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="eyebrow-light !text-[9px]">Cleveland cohort</p>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="font-serif text-[34px] leading-none text-paper">303</p>
                <p className="mt-1 text-[10.5px] text-sage-200/55">de-identified records</p>
              </div>
              <div className="text-right">
                <p className="font-serif text-[22px] leading-none text-gold-300">13</p>
                <p className="mt-1 text-[10px] text-sage-200/50">input features</p>
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-3 pt-8">
            <ApiStatus />
            <div className="flex gap-2.5 rounded-xl border border-white/[0.07] px-3 py-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sage-300/60" />
              <p className="text-[10px] leading-relaxed text-sage-200/45">
                Academic project. Outputs are not diagnoses or clinically validated
                risk scores.
              </p>
            </div>
            <p className="px-1 text-[9px] uppercase tracking-[0.14em] text-sage-200/25">
              UCI Heart Disease · Cleveland · 1988
            </p>
          </div>
        </div>
      </aside>

      <header className="no-print sticky top-0 z-40 border-b border-line/80 bg-canvas/95 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-4 pb-2.5 pt-3">
          <Link to="/predict" className="flex items-center gap-2.5">
            <BrandMark tone="light" size="sm" />
            <Wordmark />
          </Link>
          <span className="rounded-full border border-line bg-paper/70 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-muted">
            Academic demo
          </span>
        </div>
        <MobileNav />
      </header>

      <main className="lg:pl-[272px]">
        <div
          key={location.pathname}
          className="print-full mx-auto w-full max-w-[1240px] animate-fade-up px-4 pb-14 pt-6 sm:px-7 lg:px-10 lg:pb-20 lg:pt-9"
        >
          <Outlet />
        </div>
        <footer className="no-print mx-auto flex w-full max-w-[1240px] flex-col gap-2 border-t border-line/70 px-4 py-6 text-[10.5px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-10">
          <p>
            <span className="font-semibold text-ink-soft">Cardia</span> · AIML
            mini-project · Heart disease pattern detection
          </p>
          <p className="uppercase tracking-[0.12em]">
            Research &amp; teaching use only
          </p>
        </footer>
      </main>
    </div>
  );
}

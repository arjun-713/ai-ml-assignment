"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Stethoscope } from "lucide-react";
import clsx from "clsx";
import { BrandMark, Wordmark } from "./BrandMark";
import { ApiStatus } from "./ApiStatus";

const navItems = [
  {
    href: "/predict",
    label: "New assessment",
    icon: Stethoscope,
  },
  {
    href: "/insights",
    label: "Model insights",
    icon: Activity,
  },
];

function isNavActive(href: string, pathname: string): boolean {
  return pathname === href || (href === "/predict" && pathname === "/results");
}

function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="mt-3 space-y-1" aria-label="Main navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isNavActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold transition",
              active
                ? "bg-white/[0.09] text-paper"
                : "text-sage-200/60 hover:bg-white/[0.05] hover:text-paper",
            )}
          >
            <Icon
              className={clsx(
                "h-[18px] w-[18px] shrink-0",
                active ? "text-gold-300" : "text-sage-300/60",
              )}
              strokeWidth={1.8}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1.5 px-4 pb-3" aria-label="Main navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isNavActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-semibold transition",
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

export function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col overflow-hidden bg-forest-950 lg:flex">
        <div className="flex h-full flex-col px-4 pb-5 pt-6">
          <Link href="/predict" className="flex items-center gap-3 px-1">
            <BrandMark tone="dark" />
            <Wordmark light />
          </Link>

          <div className="mt-9">
            <p className="px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-sage-200/35">
              Workspace
            </p>
            <SidebarNav />
          </div>

          <div className="mt-auto pt-8">
            <ApiStatus />
            <p className="mt-4 px-1 text-[10px] uppercase tracking-[0.12em] text-sage-200/30">
              UCI Cleveland · 1988
            </p>
          </div>
        </div>
      </aside>

      <header className="no-print sticky top-0 z-40 border-b border-line/80 bg-canvas/95 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-4 pb-2.5 pt-3">
          <Link href="/predict" className="flex items-center gap-2.5">
            <BrandMark tone="light" size="sm" />
            <Wordmark />
          </Link>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            AIML demo
          </span>
        </div>
        <MobileNav />
      </header>

      <main className="lg:pl-[248px]">
        <div
          key={pathname}
          className="print-full w-full animate-fade-up px-4 pb-12 pt-6 sm:px-7 lg:px-10 lg:pb-16 lg:pt-8 xl:px-12 2xl:px-16"
        >
          {children}
        </div>
        <footer className="no-print flex w-full flex-col gap-1.5 border-t border-line/70 px-4 py-6 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-10 xl:px-12 2xl:px-16">
          <p>
            <span className="font-semibold text-ink-soft">Cardia</span> · AIML
            mini-project · Heart disease pattern detection
          </p>
          <p>Research &amp; teaching use only</p>
        </footer>
      </main>
    </div>
  );
}

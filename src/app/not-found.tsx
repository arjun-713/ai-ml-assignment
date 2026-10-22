import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="eyebrow justify-center">404</p>
      <h1 className="display mt-3 text-5xl text-ink">Page not found</h1>
      <p className="mt-3 text-[12px] text-muted">
        The page you requested does not exist in this workspace.
      </p>
      <Link href="/predict" className="btn-primary mt-6">
        Return to assessment
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

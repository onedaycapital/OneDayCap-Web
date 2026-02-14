"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ApplicationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin/applications] error:", error);
  }, [error]);

  const message = error?.message && String(error.message).trim() ? error.message : "Could not load applications.";

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center px-6 text-center">
      <h2 className="text-lg font-semibold text-slate-800 mb-2">Something went wrong</h2>
      <p className="text-slate-600 mb-6 max-w-md text-sm">{message}</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#1d5bb8] hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/admin"
          className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-200 hover:bg-slate-300"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

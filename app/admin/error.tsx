"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (error) console.error("[admin] error:", error);
  }, [error]);

  const message =
    error && typeof (error as Error).message === "string" && (error as Error).message.trim()
      ? (error as Error).message
      : "An error occurred in the admin section.";

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-6 text-center">
      <h2 className="text-xl font-semibold text-slate-800 mb-2">Something went wrong</h2>
      <p className="text-slate-600 mb-6 max-w-md">{message}</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={reset}
          className="px-6 py-2.5 rounded-lg font-medium text-white bg-[#1d5bb8] hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/admin"
          className="px-6 py-2.5 rounded-lg font-medium text-slate-700 bg-slate-200 hover:bg-slate-300"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

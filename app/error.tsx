"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-6 text-center">
      <h2 className="font-heading text-xl font-semibold text-slate-800 mb-2">
        Something went wrong
      </h2>
      <p className="text-slate-600 mb-6 max-w-md">
        {error.message || "An error occurred. Try refreshing the page."}
      </p>
      <button
        onClick={reset}
        className="px-6 py-2.5 rounded-full font-medium text-white bg-[var(--brand-blue)] hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  );
}

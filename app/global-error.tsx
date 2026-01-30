"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans min-h-screen flex flex-col items-center justify-center px-6 bg-slate-50 text-center">
        <h1 className="text-xl font-semibold text-slate-800 mb-2">
          Something went wrong
        </h1>
        <p className="text-slate-600 mb-6 max-w-md">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-full font-medium text-white bg-[#1d5bb8] hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </body>
    </html>
  );
}

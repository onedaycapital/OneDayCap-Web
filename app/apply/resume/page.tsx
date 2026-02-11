"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RESUME_EMAIL_KEY, RESUME_STEP_KEY } from "@/lib/resume-storage";

function ResumeContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const t = searchParams.get("t")?.trim();
    if (!t) {
      setStatus("error");
      setMessage("Missing resume link.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/app/resume?t=${encodeURIComponent(t)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setStatus("error");
          setMessage((data.error as string) || "This link is invalid or has expired.");
          return;
        }
        const email = data.email as string;
        const step = typeof data.current_step === "number" ? Math.min(5, Math.max(1, data.current_step)) : 1;
        try {
          sessionStorage.setItem(RESUME_EMAIL_KEY, email ?? "");
          sessionStorage.setItem(RESUME_STEP_KEY, String(step));
        } catch {
          // ignore
        }
        setStatus("ok");
        window.location.href = "/apply";
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Something went wrong. Please try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading your application…</p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Resume link</h1>
          <p className="mt-2 text-slate-600">{message}</p>
          <a
            href="/apply"
            className="mt-4 inline-block rounded-lg bg-[var(--brand-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Start application
          </a>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-slate-600">Redirecting…</p>
    </div>
  );
}

export default function ResumePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading your application…</p>
      </div>
    }>
      <ResumeContent />
    </Suspense>
  );
}

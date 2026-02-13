"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RESUME_EMAIL_KEY, RESUME_STEP_KEY, RESUME_APPLICATION_ID_KEY } from "@/lib/resume-storage";

function DocumentsContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const t = searchParams.get("t")?.trim();
    if (!t) {
      setStatus("error");
      setMessage("Missing link.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/apply/documents-resume?t=${encodeURIComponent(t)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setStatus("error");
          setMessage((data.error as string) || "This link is invalid or has expired.");
          return;
        }
        const applicationId = data.applicationId as string;
        const email = (data.email as string) ?? "";
        try {
          sessionStorage.setItem(RESUME_APPLICATION_ID_KEY, applicationId ?? "");
          sessionStorage.setItem(RESUME_STEP_KEY, "5");
          if (email) sessionStorage.setItem(RESUME_EMAIL_KEY, email);
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
        <p className="text-slate-600">Loading…</p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Submit documents</h1>
          <p className="mt-2 text-slate-600">{message}</p>
          <a
            href="/apply"
            className="mt-4 inline-block rounded-lg bg-[var(--brand-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Go to application
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

export default function DocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <p className="text-slate-600">Loading…</p>
        </div>
      }
    >
      <DocumentsContent />
    </Suspense>
  );
}

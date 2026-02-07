"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "application_pdf_download";

export function ApplicationPdfDownload() {
  const [pdf, setPdf] = useState<{ base64: string; filename: string } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { base64: string; filename: string };
        if (data?.base64 && data?.filename) {
          setPdf(data);
        }
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleDownload = () => {
    if (!pdf) return;
    try {
      const bytes = Uint8Array.from(atob(pdf.base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdf.filename;
      a.click();
      URL.revokeObjectURL(url);
      setPdf(null);
    } catch {
      // ignore
    }
  };

  const handleOpen = () => {
    if (!pdf) return;
    try {
      const bytes = Uint8Array.from(atob(pdf.base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      window.focus(); // keep user on processing-application page
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      // ignore
    }
  };

  if (!pdf) return null;

  return (
    <div className="mb-6 rounded-xl border-2 border-[var(--brand-blue)] bg-[var(--brand-blue)]/5 p-4">
      <p className="text-sm font-medium text-slate-800">
        Your application PDF is ready. View or save it to your computer.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-blue-hover)]"
        >
          Open PDF in new tab
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[var(--brand-blue)] bg-white px-4 py-2 text-sm font-semibold text-[var(--brand-blue)] hover:bg-slate-50"
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}

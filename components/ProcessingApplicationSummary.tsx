"use client";

import { useEffect, useState } from "react";
import { getGiftForFundingRequest } from "@/lib/gift-from-funding";

const STORAGE_KEY = "application_pdf_download";

interface AdditionalDetailsRow {
  label: string;
  value: string;
}

interface StoredData {
  base64?: string | null;
  filename?: string;
  additionalDetails?: AdditionalDetailsRow[] | null;
  fundingRequest?: string | null;
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function OpenInNewTabIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

export function ProcessingApplicationSummary() {
  const [pdf, setPdf] = useState<{ base64: string; filename: string } | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState<AdditionalDetailsRow[] | null>(null);
  const [fundingRequest, setFundingRequest] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as StoredData;
        if (data?.base64 && data?.filename) {
          setPdf({ base64: data.base64, filename: data.filename });
        }
        if (data?.additionalDetails && Array.isArray(data.additionalDetails) && data.additionalDetails.length > 0) {
          setAdditionalDetails(data.additionalDetails);
        }
        if (data?.fundingRequest != null && String(data.fundingRequest).trim() !== "") {
          setFundingRequest(String(data.fundingRequest).trim());
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
      window.focus();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      // ignore
    }
  };

  const hasPdf = !!pdf;
  const hasDetails = !!additionalDetails?.length;
  const gift = fundingRequest ? getGiftForFundingRequest(fundingRequest) : null;
  const hasGift = !!gift;

  if (!hasPdf && !hasDetails && !hasGift) return null;

  return (
    <>
      {hasPdf && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-[var(--brand-blue)]/40 transition-colors">
          <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Loan Application PDF File</p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              title="Download PDF"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-[var(--brand-blue)] hover:text-white hover:border-[var(--brand-blue)] transition-colors"
            >
              <DownloadIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleOpen}
              title="Open in new tab"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-[var(--brand-blue)] hover:text-white hover:border-[var(--brand-blue)] transition-colors"
            >
              <OpenInNewTabIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {hasDetails && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-[var(--brand-blue)]/40 transition-colors">
          <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Additional Details</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Summary funders see</p>
          <dl className="mt-2 space-y-1">
            {additionalDetails.map((row, i) => (
              <div key={i} className="flex gap-2 text-[10px] sm:text-xs">
                <dt className="font-medium text-slate-600 shrink-0 w-24">{row.label}:</dt>
                <dd className="text-slate-800 break-words min-w-0">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {hasGift && gift && (
        <div className="relative overflow-hidden rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 p-4 shadow-lg">
          <div className="absolute right-2 top-2 text-3xl opacity-90" style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.9)) drop-shadow(0 0 12px rgba(255,255,255,0.6))" }} aria-hidden>🎁</div>
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-900/80">Your guaranteed gift</p>
            <p className="mt-1 font-heading text-sm font-bold text-white drop-shadow-sm">Free Gift - {gift.label}</p>
            <p className="mt-0.5 text-[10px] text-white/95">Complete funding to receive this reward.</p>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  listFundersForSubmit,
  listRecentApplications,
  submitApplicationToFunders,
  type FunderOption,
  type ApplicationOption,
} from "@/app/actions/submit-to-funders";

export function SubmitToFundersForm() {
  const [applications, setApplications] = useState<ApplicationOption[]>([]);
  const [funders, setFunders] = useState<FunderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicationId, setApplicationId] = useState("");
  const [selectedFunderIds, setSelectedFunderIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    listRecentApplications().then((apps) => {
      setApplications(apps);
      if (apps.length) setApplicationId((prev) => prev || apps[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!applicationId) return;
    listFundersForSubmit(applicationId).then(setFunders);
  }, [applicationId]);

  const toggleFunder = (id: string) => {
    setSelectedFunderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFunders = () => {
    setSelectedFunderIds(new Set(funders.map((f) => f.id)));
  };

  const clearFunders = () => {
    setSelectedFunderIds(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!applicationId) {
      setMessage({ type: "error", text: "Select an application." });
      return;
    }
    if (selectedFunderIds.size === 0) {
      setMessage({ type: "error", text: "Select at least one funder." });
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitApplicationToFunders(applicationId, Array.from(selectedFunderIds));
      if (!result.success) {
        setMessage({ type: "error", text: result.error ?? "Something went wrong." });
        return;
      }
      const ok = result.submitted ?? 0;
      const failCount = result.failed?.length ?? 0;
      if (failCount > 0) {
        setMessage({
          type: "success",
          text: `Sent to ${ok} funder(s). ${failCount} failed: ${result.failed!.map((f) => `${f.funderName}: ${f.error}`).join("; ")}`,
        });
      } else {
        setMessage({ type: "success", text: `Sent to ${ok} funder(s).` });
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Request failed." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-500">Loading applications and funders…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="application" className="block text-sm font-medium text-slate-700 mb-1">
          Application
        </label>
        <select
          id="application"
          value={applicationId}
          onChange={(e) => setApplicationId(e.target.value)}
          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--brand-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)]"
        >
          {applications.length === 0 ? (
            <option value="">No applications</option>
          ) : (
            applications.map((a) => (
              <option key={a.id} value={a.id}>
                {a.businessName} — {new Date(a.createdAt).toLocaleDateString()} ({a.id.slice(0, 8)}…)
              </option>
            ))
          )}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700">Funders</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllFunders}
              className="text-xs text-[var(--brand-blue)] hover:underline"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearFunders}
              className="text-xs text-slate-500 hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 max-h-64 overflow-y-auto space-y-2">
          {funders.length === 0 ? (
            <p className="text-sm text-slate-500">No funders. Add funders and contacts in the database.</p>
          ) : (
            funders.map((f) => (
              <label key={f.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedFunderIds.has(f.id)}
                  onChange={() => toggleFunder(f.id)}
                  className="rounded border-slate-300 text-[var(--brand-blue)] focus:ring-[var(--brand-blue)]"
                />
                <span className="text-sm font-medium text-slate-800">{f.name}</span>
                {f.isoAgreementSigned && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">ISO signed</span>
                )}
                {f.matched && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">Shortlist</span>
                )}
                {f.email && (
                  <span className="text-xs text-slate-500 truncate">{f.email}</span>
                )}
                {f.relationshipStatus !== "active" && (
                  <span className="text-xs text-amber-600">({f.relationshipStatus})</span>
                )}
              </label>
            ))
          )}
        </div>
        <p className="mt-1.5 text-xs text-slate-500">Auto-match on application submit only sends to funders with a signed ISO agreement (marked above).</p>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || applications.length === 0 || funders.length === 0}
        className="rounded-lg bg-[var(--brand-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Sending…" : "Send application to selected funders"}
      </button>
    </form>
  );
}

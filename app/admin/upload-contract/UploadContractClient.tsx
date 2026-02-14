"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  extractFunderGuidelinesFromPdf,
  saveExtractedFunderGuidelines,
  type ExtractResult,
} from "@/app/actions/admin-contract-upload";
import type { AdminFunderRow } from "@/app/actions/admin-funders";
import type { ExtractedFunderGuidelines } from "@/lib/extract-funder-guidelines";

export function UploadContractClient({ funders }: { funders: AdminFunderRow[] }) {
  const router = useRouter();
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedFunderGuidelines | null>(null);
  const [funderId, setFunderId] = useState<string>("");
  const [markIsoSigned, setMarkIsoSigned] = useState(false);
  const [form, setForm] = useState<ExtractedFunderGuidelines | null>(null);

  const handleExtract = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setExtracted(null);
    setForm(null);
    const formEl = e.currentTarget;
    const formData = new FormData(formEl);
    setExtracting(true);
    try {
      const result: ExtractResult = await extractFunderGuidelinesFromPdf(formData);
      if (!result.success) {
        setError(result.error ?? "Extraction failed.");
        return;
      }
      if (result.data) {
        setExtracted(result.data);
        setForm(result.data);
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!form) return;
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
        funder_id: funderId || undefined,
        mark_iso_signed: markIsoSigned,
      };
      const result = await saveExtractedFunderGuidelines(payload);
      if (!result.success) {
        setError(result.error ?? "Save failed.");
        return;
      }
      router.refresh();
      setExtracted(null);
      setForm(null);
      setFunderId("");
      setMarkIsoSigned(false);
    } finally {
      setSaving(false);
    }
  };

  const updateForm = <K extends keyof ExtractedFunderGuidelines>(key: K, value: ExtractedFunderGuidelines[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">1. Upload PDF</h2>
        <form onSubmit={handleExtract} className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="contract-file" className="block text-xs font-medium text-slate-700 mb-1">
              Guidelines or ISO contract (PDF)
            </label>
            <input
              id="contract-file"
              name="file"
              type="file"
              accept=".pdf"
              className="block text-sm text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={extracting}
            className="rounded-lg bg-[var(--brand-blue)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {extracting ? "Extracting…" : "Extract"}
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-500">
          Requires OPENAI_API_KEY in .env.local. Extract pulls funder name, min/max funding, states, required docs, etc.
        </p>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {form && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">2. Review and save</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Funder</label>
              <select
                value={funderId}
                onChange={(e) => setFunderId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">New: {form.funder_name || "(extracted name)"}</option>
                {funders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="iso-signed"
                type="checkbox"
                checked={markIsoSigned}
                onChange={(e) => setMarkIsoSigned(e.target.checked)}
                className="rounded border-slate-300"
              />
              <label htmlFor="iso-signed" className="text-sm text-slate-700">
                Mark ISO agreement signed
              </label>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Funder name (if new)</label>
              <input
                type="text"
                value={form.funder_name ?? ""}
                onChange={(e) => updateForm("funder_name", e.target.value || null)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Min funding</label>
              <input
                type="number"
                value={form.min_funding ?? ""}
                onChange={(e) => updateForm("min_funding", e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Max funding</label>
              <input
                type="number"
                value={form.max_funding ?? ""}
                onChange={(e) => updateForm("max_funding", e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">States excluded (e.g. TX, CA)</label>
              <input
                type="text"
                value={form.states_excluded?.join(", ") ?? ""}
                onChange={(e) =>
                  updateForm(
                    "states_excluded",
                    e.target.value ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : null
                  )
                }
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="TX, CA"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">States allowed (e.g. NY, NJ)</label>
              <input
                type="text"
                value={form.states_allowed?.join(", ") ?? ""}
                onChange={(e) =>
                  updateForm(
                    "states_allowed",
                    e.target.value ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : null
                  )
                }
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="NY, NJ"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Turnaround time</label>
              <input
                type="text"
                value={form.turnaround_time ?? ""}
                onChange={(e) => updateForm("turnaround_time", e.target.value || null)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="24-48 hours"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-4 rounded-lg bg-[var(--brand-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save to funders & guidelines"}
          </button>
        </section>
      )}

      <p className="text-sm">
        <Link href="/admin/funders" className="text-[var(--brand-blue)] hover:underline">
          ← Funders list
        </Link>
      </p>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  uploadStagingCsv,
  processStagingImportJob,
  processNextPreStagingBatch,
  processSelectedPreStagingBatch,
  getQuarantineCsv,
  type StagingImportJobRow,
  type SchemaCheckResult,
} from "@/app/actions/admin-staging-import";

export function UploadMerchantDbClient({
  jobs: initialJobs,
  listError: initialListError,
  stagingCount = 0,
  stagingCountError,
  stagingTableName = "Staging",
  preStagingCount = 0,
  preStagingCountError,
  preStagingTableName = "pre_staging",
  otherPreStagingTable,
  otherPreStagingCount,
  quarantineCount = 0,
  quarantineCountError,
  schemaCheck,
}: {
  jobs: StagingImportJobRow[];
  listError?: string;
  stagingCount?: number;
  stagingCountError?: string;
  stagingTableName?: string;
  preStagingCount?: number;
  preStagingCountError?: string;
  preStagingTableName?: string;
  otherPreStagingTable?: string;
  otherPreStagingCount?: number;
  quarantineCount?: number;
  quarantineCountError?: string;
  schemaCheck?: SchemaCheckResult;
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [listError, setListError] = useState<string | null>(initialListError ?? null);
  // Display pre-staging count: use fresh value from process action so UI updates without waiting for refresh
  const [displayPreStagingCount, setDisplayPreStagingCount] = useState(preStagingCount);
  const [displayOtherPreStagingCount, setDisplayOtherPreStagingCount] = useState(otherPreStagingCount ?? 0);
  const [displayStagingCount, setDisplayStagingCount] = useState(stagingCount);
  const [processMainSelected, setProcessMainSelected] = useState(true);
  const [processOtherSelected, setProcessOtherSelected] = useState(false);
  useEffect(() => {
    setDisplayPreStagingCount(preStagingCount);
  }, [preStagingCount]);
  useEffect(() => {
    setDisplayOtherPreStagingCount(otherPreStagingCount ?? 0);
  }, [otherPreStagingCount]);
  useEffect(() => {
    setDisplayStagingCount(stagingCount);
  }, [stagingCount]);
  // Sync from server, but don't overwrite with empty when we have local jobs (e.g. just added optimistically)
  useEffect(() => {
    if (initialJobs.length > 0) {
      setJobs(initialJobs);
    }
    setListError(initialListError ?? null);
  }, [initialJobs, initialListError]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingNextBatch, setProcessingNextBatch] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [processSuccess, setProcessSuccess] = useState<string | null>(null);
  const [progressTotal, setProgressTotal] = useState<number | null>(null);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    setUploading(true);
    try {
      const result = await uploadStagingCsv(formData);
      if (!result.success) {
        setUploadError(result.error ?? "Upload failed.");
        return;
      }
      const count = result.preStagingCount ?? 0;
      setDisplayPreStagingCount((prev) => prev + count);
      setUploadSuccess(
        `Uploaded ${count} row${count !== 1 ? "s" : ""} to Pre-Staging. See "Recent imports" below — click Normalize & dedupe to run formatting and move uniques to Staging.`
      );
      // Show the new job immediately so user sees it even if list was empty or refresh is slow
      const newJob: StagingImportJobRow = {
        id: result.importJobId!,
        sourceFilename: result.filename ?? null,
        createdAt: result.createdAt ?? new Date().toISOString(),
        preStagingCount: count,
        dupCount: 0,
        insertedCount: 0,
        status: "pending",
      };
      setJobs((prev) => [newJob, ...prev]);
      setListError(null);
      router.refresh();
      form.reset();
    } finally {
      setUploading(false);
    }
  };

  const handleProcess = async (importJobId: string) => {
    setProcessError(null);
    setProcessSuccess(null);
    setProcessingId(importJobId);
    const job = jobs.find((j) => j.id === importJobId);
    try {
      const result = await processStagingImportJob(importJobId);
      if (!result.success) {
        setProcessError(result.error ?? "Process failed.");
        return;
      }
      const inserted = result.insertedCount ?? 0;
      const dups = result.dupCount ?? 0;
      const after = result.stagingCountAfter ?? 0;
      const before = after - inserted;
      const remaining = result.preStagingRemaining ?? 0;
      let msg =
        `${inserted} inserted into Staging, ${dups} to Quarantine this batch.` +
        (result.stagingCountAfter != null ? ` Staging table: ${before} → ${after} rows.` : "");
      if (result.hasMore && remaining > 0) {
        msg += ` ${remaining.toLocaleString()} remaining in Pre-Staging — click again to continue.`;
      }
      setProcessSuccess(msg);
      if (result.preStagingCountAfter != null) setDisplayPreStagingCount(result.preStagingCountAfter);
      setJobs((prev) =>
        prev.map((j) => {
          if (j.id !== importJobId) return j;
          const cumulativeInserted = (j.insertedCount ?? 0) + inserted;
          const cumulativeDups = (j.dupCount ?? 0) + dups;
          return {
            ...j,
            status: result.hasMore ? "pending" : "processed",
            insertedCount: cumulativeInserted,
            dupCount: cumulativeDups,
            preStagingRemaining: remaining,
          };
        })
      );
      router.refresh();
    } finally {
      setProcessingId(null);
    }
  };

  const handleProcessNextBatch = async () => {
    setProcessError(null);
    setProcessSuccess(null);
    setProcessingNextBatch(true);
    try {
      const result = await processNextPreStagingBatch();
      if (!result.success) {
        setProcessError(result.error ?? "Process failed.");
        return;
      }
      const inserted = result.insertedCount ?? 0;
      const dups = result.dupCount ?? 0;
      const after = result.stagingCountAfter ?? 0;
      const before = after - inserted;
      const remaining = result.preStagingRemaining ?? 0;
      let msg =
        `${inserted} inserted into Staging, ${dups} to Quarantine this batch.` +
        (result.stagingCountAfter != null ? ` Staging table: ${before} → ${after} rows.` : "");
      if (result.hasMore && remaining > 0) {
        msg += ` ${remaining.toLocaleString()} remaining in Pre-Staging — click again to continue.`;
      } else if (!result.hasMore && remaining === 0) {
        msg += " Pre-Staging is now 0.";
      }
      setProcessSuccess(msg);
      if (result.preStagingCountAfter != null) setDisplayPreStagingCount(result.preStagingCountAfter);
      router.refresh();
    } finally {
      setProcessingNextBatch(false);
    }
  };

  const handleProcessSelectedBatch = async () => {
    setProcessError(null);
    setProcessSuccess(null);
    setProcessingNextBatch(true);
    setProgressTotal((prev) => {
      const remaining = (processMainSelected ? displayPreStagingCount : 0) + (processOtherSelected ? displayOtherPreStagingCount : 0);
      return prev ?? (remaining > 0 ? remaining : null);
    });
    try {
      const result = await processSelectedPreStagingBatch({
        processMain: processMainSelected,
        processOther: processOtherSelected,
      });
      if (!result.success) {
        setProcessError(result.error ?? "Process failed.");
        return;
      }
      const inserted = result.insertedCount ?? 0;
      const dups = result.dupCount ?? 0;
      const after = result.stagingCountAfter ?? 0;
      const before = after - inserted;
      let msg =
        `${inserted} inserted into Staging, ${dups} to Quarantine this batch.` +
        (result.stagingCountAfter != null ? ` Staging table: ${before} → ${after} rows.` : "");
      if (result.hasMore) {
        msg += " Click again to process more.";
      } else {
        msg += " Selected table(s) processed for this batch.";
      }
      setProcessSuccess(msg);
      if (result.preStagingCountAfter != null) setDisplayPreStagingCount(result.preStagingCountAfter);
      if (result.otherPreStagingCountAfter != null) setDisplayOtherPreStagingCount(result.otherPreStagingCountAfter);
      if (result.stagingCountAfter != null) setDisplayStagingCount(result.stagingCountAfter);
      const newMain = result.preStagingCountAfter ?? displayPreStagingCount;
      const newOther = result.otherPreStagingCountAfter ?? displayOtherPreStagingCount;
      const remaining = (processMainSelected ? newMain : 0) + (processOtherSelected ? newOther : 0);
      if (remaining === 0) setProgressTotal(null);
      router.refresh();
    } finally {
      setProcessingNextBatch(false);
    }
  };

  const handleDownloadQuarantine = async (job: StagingImportJobRow) => {
    setProcessError(null);
    const result = await getQuarantineCsv(job.id);
    if (!result.success || result.csv == null) {
      setProcessError(result.error ?? "Download failed.");
      return;
    }
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quarantine-${job.sourceFilename ?? job.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {schemaCheck && !schemaCheck.ok && schemaCheck.errors.length > 0 && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4" aria-label="Schema check">
          <h2 className="text-sm font-semibold text-red-800 mb-2">Schema sanity check</h2>
          <p className="text-sm text-red-700 mb-2">The following issues will block upload and Normalize & dedupe. Fix in Supabase (run migrations or set env vars) then refresh.</p>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {schemaCheck.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </section>
      )}
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4" aria-label="Table status">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Current table status</h2>
        <p className="text-sm text-slate-600 mb-2">Choose which pre-staging table(s) to process, then click Normalize & dedupe selected.</p>
        <div className="space-y-1.5 mb-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={processMainSelected}
              onChange={(e) => setProcessMainSelected(e.target.checked)}
              className="rounded border-slate-300 text-[var(--brand-blue)] focus:ring-[var(--brand-blue)]"
            />
            <span className="font-medium">{preStagingTableName}</span>
            <span className="text-slate-500">(used for upload):</span>{" "}
            {preStagingCountError ? (
              <span className="text-amber-600">Could not load</span>
            ) : (
              <span>{displayPreStagingCount.toLocaleString()} rows</span>
            )}
          </label>
          {otherPreStagingTable != null && (
            <div>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={processOtherSelected}
                  onChange={(e) => setProcessOtherSelected(e.target.checked)}
                  className="rounded border-slate-300 text-[var(--brand-blue)] focus:ring-[var(--brand-blue)]"
                />
                <span className="font-medium">{otherPreStagingTable}</span>
                <span className="text-slate-500">(other table):</span>{" "}
                <span>{displayOtherPreStagingCount.toLocaleString()} rows</span>
              </label>
              <p className="text-xs text-slate-500 mt-0.5 ml-6">
                If processing fails: set <code className="bg-slate-200 px-1 rounded">SUPABASE_OTHER_PRE_STAGING_ID_COLUMN</code> to your table&apos;s PK (e.g. <code className="bg-slate-200 px-1 rounded">&quot;Primary Key&quot;</code>). If the API can&apos;t find the table, try <code className="bg-slate-200 px-1 rounded">SUPABASE_OTHER_PRE_STAGING_TABLE=pre_staging</code>. Restart dev after changing .env.local.
              </p>
            </div>
          )}
        </div>
        <p className="text-sm text-slate-700 mb-1">
          <span className="font-medium">Staging</span>{" "}
          <span className="text-slate-500">(table <code className="bg-slate-200 px-1 rounded">{stagingTableName}</code>):</span>{" "}
          {stagingCountError ? (
            <span className="text-amber-600">Could not load ({stagingCountError})</span>
          ) : (
            <span>{displayStagingCount.toLocaleString()} rows</span>
          )}
          {" · "}
          <span className="font-medium">Quarantine:</span>{" "}
          {quarantineCountError ? (
            <span className="text-amber-600">Could not load ({quarantineCountError})</span>
          ) : (
            <span>{quarantineCount.toLocaleString()} rows</span>
          )}
        </p>
        <p className="text-xs text-slate-500 mb-1">
          <strong>Where data goes:</strong> Uniques → <strong>Staging</strong> (table <code className="bg-slate-200 px-1 rounded">{stagingTableName}</code>). Duplicates → <strong>Quarantine</strong>. Rows are removed only from the pre-staging table(s) after each batch; nothing is deleted from Staging. The count above is exact (over 50k, use this page or run migration 015 for RPC count; Supabase Table Editor may not show exact totals).
        </p>
        {(displayPreStagingCount > 0 || displayOtherPreStagingCount > 0) && (processMainSelected || processOtherSelected) && (
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleProcessSelectedBatch}
                disabled={processingNextBatch}
                className="rounded-lg bg-[var(--brand-blue)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {processingNextBatch ? "Processing…" : "Normalize & dedupe selected"}
              </button>
              <span className="text-xs text-slate-500">
                One batch per click (1,000 rows default; set STAGING_PROCESS_BATCH_SIZE=5000 for larger). Keep clicking until selected table(s) show 0 rows.
              </span>
            </div>
            {processingNextBatch && (
              <div className="w-full rounded-full bg-slate-200 overflow-hidden" role="progressbar" aria-valuetext="Processing batch…">
                <div className="h-2 bg-[var(--brand-blue)] progress-bar-indeterminate" style={{ width: "40%" }} />
              </div>
            )}
            {progressTotal != null && progressTotal > 0 && !processingNextBatch && (
              <div className="space-y-1">
                <div className="w-full rounded-full bg-slate-200 overflow-hidden h-2" role="progressbar" aria-valuenow={Math.round((1 - ((processMainSelected ? displayPreStagingCount : 0) + (processOtherSelected ? displayOtherPreStagingCount : 0)) / progressTotal) * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className="h-full bg-[var(--brand-blue)] transition-[width] duration-300"
                    style={{ width: `${Math.min(100, 100 * (1 - ((processMainSelected ? displayPreStagingCount : 0) + (processOtherSelected ? displayOtherPreStagingCount : 0)) / progressTotal))}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {(processMainSelected ? displayPreStagingCount : 0) + (processOtherSelected ? displayOtherPreStagingCount : 0)} of {progressTotal.toLocaleString()} rows remaining
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Upload CSV</h2>
        <p className="text-sm text-slate-600 mb-3">
          First row must be headers. Column names are matched to Staging (e.g. &quot;Email 1&quot;, &quot;First Name&quot;, &quot;Business Name&quot;). Flexible matching (case-insensitive, &quot;email1&quot; → &quot;Email 1&quot;).
        </p>
        <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="file" className="block text-xs font-medium text-slate-700 mb-1">
              CSV file
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv"
              className="block text-sm text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              required
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="rounded-lg bg-[var(--brand-blue)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload to Pre-Staging"}
          </button>
        </form>
        {uploadError && (
          <p className="mt-2 text-sm text-red-600">{uploadError}</p>
        )}
        {uploadSuccess && (
          <p className="mt-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
            {uploadSuccess}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Recent imports</h2>
        <p className="text-sm text-slate-600 mb-3 rounded-md bg-slate-50 border border-slate-200 px-3 py-2">
          Data stays in Pre-Staging until you run the action above. Click <strong>Normalize & dedupe selected</strong> to format fields (SSN, EIN, email, phone), remove duplicates against Staging, then move uniques to Staging and duplicates to Quarantine. Batches: 1,000 rows per click (set STAGING_PROCESS_BATCH_SIZE=5000 for larger). Keep clicking until selected table(s) show 0 rows.
        </p>
        <p className="text-xs text-slate-500 mb-3">
          This table lists <strong>CSV uploads</strong> to the main pre-staging table only. Processing the other table (Pre_Staging) does not add a row here; the green success message above shows each batch result (inserted, duplicates, Staging count).
        </p>
        {listError && (
          <p className="mb-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Could not load import history. Your uploads may still have succeeded — try uploading again and check for the success message. Error: {listError}
          </p>
        )}
        {processError && (
          <p className="mb-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{processError}</p>
        )}
        {processSuccess && (
          <p className="mb-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
            {processSuccess}
          </p>
        )}
        {jobs.length === 0 && !listError ? (
          <p className="text-sm text-slate-500">No imports yet. Upload a CSV above.</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-slate-500">Upload a CSV above; your new job will appear here after a successful upload.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2 pr-4 font-medium text-slate-700">Filename</th>
                  <th className="py-2 pr-4 font-medium text-slate-700">Uploaded</th>
                  <th className="py-2 pr-4 font-medium text-slate-700">Original</th>
                  <th className="py-2 pr-4 font-medium text-slate-700">Duplicates</th>
                  <th className="py-2 pr-4 font-medium text-slate-700">Inserted</th>
                  <th className="py-2 pr-4 font-medium text-slate-700">Status</th>
                  <th className="py-2 pr-4 font-medium text-slate-700">Summary</th>
                  <th className="py-2 font-medium text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-slate-800">{job.sourceFilename ?? "–"}</td>
                    <td className="py-2 pr-4 text-slate-600">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{job.preStagingCount}</td>
                    <td className="py-2 pr-4 text-slate-600">{job.dupCount}</td>
                    <td className="py-2 pr-4 text-slate-600">{job.insertedCount}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          job.status === "processed"
                            ? "text-emerald-600"
                            : job.status === "failed"
                              ? "text-red-600"
                              : "text-amber-600"
                        }
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">
                      {job.status === "processed"
                        ? `${job.preStagingCount} → ${job.insertedCount} staged, ${job.dupCount} dupes`
                        : "—"}
                    </td>
                    <td className="py-2">
                      {job.status === "pending" || job.status === "processing" ? (
                        <button
                          type="button"
                          onClick={() => handleProcess(job.id)}
                          disabled={job.status === "processing" || processingId === job.id}
                          className="text-[var(--brand-blue)] hover:underline disabled:opacity-50"
                        >
                          {processingId === job.id
                            ? "Normalizing & deduping…"
                            : (job.preStagingRemaining != null && job.preStagingRemaining > 0)
                              ? `Normalize & dedupe (${job.preStagingRemaining.toLocaleString()} remaining)`
                              : "Normalize & dedupe"}
                        </button>
                      ) : job.status === "processed" && job.dupCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleDownloadQuarantine(job)}
                          className="text-[var(--brand-blue)] hover:underline"
                        >
                          Download quarantine
                        </button>
                      ) : (
                        "–"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

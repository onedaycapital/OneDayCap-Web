"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { parse } from "csv-parse/sync";
import { getSupabaseServer } from "@/lib/supabase-server";
import { mapCsvRecordToStagingRow, STAGING_DATA_COLUMNS } from "@/lib/staging-csv";
import { normalizeStagingRow } from "@/lib/normalize-staging-row";
import { getPreStagingTable, getPreStagingIdColumn, getStagingIdColumn, getStagingTable, quoteColumnForSelect } from "@/lib/staging-config";

const EMAIL_COLUMNS = [
  "Email 1",
  "Email 2",
  "Email 3",
  "Email 4",
  "Email 5",
  "Email 6",
  "Owner 2 Email 1",
  "Owner 2 Email 2",
  "Owner 2 Email 3",
  "Owner 2 Email 4",
  "Owner 2 Email 5",
] as const;

function normalizeEmail(e: string | null | undefined): string {
  if (e == null) return "";
  const t = String(e).trim();
  return t === "" ? "" : t.toLowerCase();
}

/** Get all non-empty normalized emails from a staging-like row. */
function getNormalizedEmails(row: Record<string, string | null>): string[] {
  const set = new Set<string>();
  for (const col of EMAIL_COLUMNS) {
    const v = normalizeEmail(row[col]);
    if (v) set.add(v);
  }
  return Array.from(set);
}

export interface UploadStagingResult {
  success: boolean;
  error?: string;
  importJobId?: string;
  filename?: string;
  preStagingCount?: number;
  createdAt?: string;
}

export async function uploadStagingCsv(formData: FormData): Promise<UploadStagingResult> {
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { success: false, error: "No file selected." };
  }
  const filename = file.name;
  if (!filename.toLowerCase().endsWith(".csv")) {
    return { success: false, error: "File must be a CSV." };
  }
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { success: false, error: "Could not read file." };
  }
  let records: Record<string, string>[];
  try {
    records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch (e) {
    return { success: false, error: "Invalid CSV: " + (e instanceof Error ? e.message : String(e)) };
  }
  if (records.length === 0) {
    return { success: false, error: "CSV has no data rows." };
  }
  const supabase = getSupabaseServer();

  const { data: job, error: jobError } = await supabase
    .from("staging_import_job")
    .insert({
      source_filename: filename,
      pre_staging_count: records.length,
      status: "pending",
    })
    .select("id, created_at")
    .single();
  if (jobError || !job?.id) {
    return { success: false, error: jobError?.message ?? "Failed to create import job." };
  }
  const importJobId = job.id as string;
  const createdAt = (job as { created_at?: string }).created_at ?? new Date().toISOString();

  const rows = records.map((rec) => {
    const raw = mapCsvRecordToStagingRow(rec);
    const normalized = normalizeStagingRow(raw);
    return {
      import_job_id: importJobId,
      ...normalized,
    };
  });

  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error: insertError } = await supabase.from(getPreStagingTable()).insert(chunk);
    if (insertError) {
      await supabase.from("staging_import_job").update({ status: "failed" }).eq("id", importJobId);
      return { success: false, error: insertError.message, importJobId };
    }
  }

  return {
    success: true,
    importJobId,
    filename,
    preStagingCount: records.length,
    createdAt,
  };
}

/** Process up to this many pre_staging rows per click. Server should handle this in one go. Env STAGING_PROCESS_BATCH_SIZE overrides (max 5000). */
const DEFAULT_BATCH_SIZE = 1000;
const MAX_BATCH_SIZE = 5000;
function getBatchSize(): number {
  const n = process.env.STAGING_PROCESS_BATCH_SIZE;
  if (n == null || n === "") return DEFAULT_BATCH_SIZE;
  const parsed = parseInt(n, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, MAX_BATCH_SIZE) : DEFAULT_BATCH_SIZE;
}

export interface ProcessStagingResult {
  success: boolean;
  error?: string;
  dupCount?: number;
  insertedCount?: number;
  /** Total rows in staging table after this run (for before/after message). */
  stagingCountAfter?: number;
  /** More rows left in Pre-Staging for this job; user should click again. */
  hasMore?: boolean;
  /** Pre-Staging rows remaining for this job after this batch. */
  preStagingRemaining?: number;
  /** Total rows left in pre-staging table (so UI can show correct count without waiting for refresh). */
  preStagingCountAfter?: number;
  /** When processing the other pre-staging table, total rows left in that table after this batch. */
  otherPreStagingCountAfter?: number;
}

export async function processStagingImportJob(importJobId: string): Promise<ProcessStagingResult> {
  const supabase = getSupabaseServer();
  const stagingTable = process.env.SUPABASE_STAGING_TABLE || "staging";
  const batchSize = getBatchSize();

  const { data: job, error: jobErr } = await supabase
    .from("staging_import_job")
    .select("id, status, pre_staging_count, dup_count, inserted_count")
    .eq("id", importJobId)
    .single();
  if (jobErr || !job) {
    return { success: false, error: "Import job not found." };
  }
  if (job.status === "processed") {
  const idCol = getPreStagingIdColumn();
  const { count: remaining } = await supabase
    .from(getPreStagingTable())
    .select(quoteColumnForSelect(idCol), { count: "exact", head: true })
    .eq("import_job_id", importJobId);
  if ((remaining ?? 0) === 0) {
      const { data: j2 } = await supabase
        .from("staging_import_job")
        .select("dup_count, inserted_count")
        .eq("id", importJobId)
        .single();
      return {
        success: true,
        dupCount: j2?.dup_count ?? 0,
        insertedCount: j2?.inserted_count ?? 0,
        hasMore: false,
        preStagingRemaining: 0,
      };
    }
  }

  await supabase.from("staging_import_job").update({ status: "processing" }).eq("id", importJobId);

  const idCol = getPreStagingIdColumn();
  const preSelect = quoteColumnForSelect(idCol) + ", " + STAGING_DATA_COLUMNS.map((c) => `"${c}"`).join(", ");
  const { data: preRows, error: preErr } = await supabase
    .from(getPreStagingTable())
    .select(preSelect)
    .eq("import_job_id", importJobId)
    .order(quoteColumnForSelect(idCol), { ascending: true })
    .limit(batchSize);
  if (preErr) {
    await supabase.from("staging_import_job").update({ status: "failed" }).eq("id", importJobId);
    const msg = preErr.message ?? "";
    if (msg.includes(" does not exist") && getPreStagingTable() === "Pre_Staging") {
      return { success: false, error: `Pre_Staging primary key column not found. Set SUPABASE_PRE_STAGING_ID_COLUMN to your table's PK column name (e.g. "Primary Key" or Id). See docs/migrations/013.` };
    }
    return { success: false, error: preErr.message };
  }
  const preStagingRows = (preRows ?? []) as unknown as Record<string, unknown>[];

  if (preStagingRows.length === 0) {
    await supabase.from("staging_import_job").update({ status: "processed" }).eq("id", importJobId);
    const { data: j2 } = await supabase
      .from("staging_import_job")
      .select("dup_count, inserted_count")
      .eq("id", importJobId)
      .single();
    return {
      success: true,
      dupCount: j2?.dup_count ?? 0,
      insertedCount: j2?.inserted_count ?? 0,
      hasMore: false,
      preStagingRemaining: 0,
    };
  }

  // 1) Normalize this batch in place
  for (const preRow of preStagingRows) {
    const row = preRow as Record<string, string | null>;
    const normalized = normalizeStagingRow(row);
    const updatePayload: Record<string, unknown> = {};
    for (const col of STAGING_DATA_COLUMNS) {
      if (col in normalized) updatePayload[col] = normalized[col] ?? null;
    }
    const { error: updateErr } = await supabase
      .from(getPreStagingTable())
      .update(updatePayload)
      .eq(quoteColumnForSelect(idCol), preRow[idCol]);
    if (updateErr) {
      await supabase.from("staging_import_job").update({ status: "failed" }).eq("id", importJobId);
      return { success: false, error: "Normalize update failed: " + updateErr.message };
    }
  }

  const normalizedRows = preStagingRows.map((r) => normalizeStagingRow(r as Record<string, string | null>));

  const stagingIdCol = getStagingIdColumn();
  const { data: stagingRows, error: stErr } = await supabase
    .from(getStagingTable())
    .select("*");
  if (stErr) {
    await supabase.from("staging_import_job").update({ status: "failed" }).eq("id", importJobId);
    return { success: false, error: stErr.message };
  }
  const stagingList = (stagingRows ?? []) as unknown as Record<string, string | null>[];
  const emailToStagingId = new Map<string, string | number>();
  for (const row of stagingList) {
    const rowId = row[stagingIdCol] as string | number | undefined;
    if (rowId == null) continue;
    for (const col of EMAIL_COLUMNS) {
      if (!(col in row)) continue;
      const v = normalizeEmail(row[col]);
      if (v && !emailToStagingId.has(v)) emailToStagingId.set(v, rowId);
    }
  }
  const allowedStagingColumns = stagingList.length > 0 ? new Set<string>(Object.keys(stagingList[0])) : null;

  let dupCount = 0;
  let insertedCount = 0;
  const dataCols = STAGING_DATA_COLUMNS as unknown as string[];
  const processedIds: (string | number)[] = [];

  for (let i = 0; i < normalizedRows.length; i++) {
    const row = normalizedRows[i];
    const preRow = preStagingRows[i];
    const emails = getNormalizedEmails(row);
    let matchedStagingId: string | number | null = null;
    for (const e of emails) {
      const sid = emailToStagingId.get(e);
      if (sid != null) {
        matchedStagingId = sid;
        break;
      }
    }
    const stagingPayload: Record<string, unknown> = {};
    for (const c of dataCols) {
      if (allowedStagingColumns !== null && !allowedStagingColumns.has(c)) continue;
      const v = row[c];
      stagingPayload[c] = v ?? null;
    }
    const quarantinePayload = {
      import_job_id: importJobId,
      quarantine_reason: "duplicate",
      original_staging_id: matchedStagingId,
      ...stagingPayload,
    };

    if (matchedStagingId != null) {
      const { error: qErr } = await supabase.from("staging_quarantine").insert(quarantinePayload);
      if (qErr) {
        await supabase.from("staging_import_job").update({ status: "failed" }).eq("id", importJobId);
        return { success: false, error: "Quarantine insert: " + qErr.message };
      }
      dupCount++;
    } else {
      const { data: inserted, error: sErr } = await supabase
        .from(getStagingTable())
        .insert(stagingPayload)
        .select(quoteColumnForSelect(stagingIdCol))
        .single();
      if (sErr) {
        await supabase.from("staging_import_job").update({ status: "failed" }).eq("id", importJobId);
        return { success: false, error: "Staging insert: " + sErr.message };
      }
      insertedCount++;
      const insertedRow = inserted as unknown as Record<string, unknown> | null;
      const newId = insertedRow?.[stagingIdCol] as string | number | undefined;
      if (newId != null) {
        for (const e of emails) {
          if (!emailToStagingId.has(e)) emailToStagingId.set(e, newId);
        }
      }
    }
    processedIds.push(preRow[idCol] as string | number);
  }

  const { error: deleteErr } = await supabase.from(getPreStagingTable()).delete().in(quoteColumnForSelect(idCol), processedIds);
  if (deleteErr) {
    await supabase.from("staging_import_job").update({ status: "failed" }).eq("id", importJobId);
    return { success: false, error: "Failed to remove processed rows from Pre-Staging: " + deleteErr.message };
  }

  const { count: remainingCount } = await supabase
    .from(getPreStagingTable())
    .select(quoteColumnForSelect(idCol), { count: "exact", head: true })
    .eq("import_job_id", importJobId);
  const remaining = remainingCount ?? 0;
  const currentDup = (job as { dup_count?: number }).dup_count ?? 0;
  const currentInserted = (job as { inserted_count?: number }).inserted_count ?? 0;

  const { error: updateErr } = await supabase
    .from("staging_import_job")
    .update({
      dup_count: currentDup + dupCount,
      inserted_count: currentInserted + insertedCount,
      status: remaining === 0 ? "processed" : "pending",
    })
    .eq("id", importJobId);
  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  const { count: stagingCountAfter } = await supabase
    .from(getStagingTable())
    .select("*", { count: "exact", head: true });
  const { count: preTotal } = await supabase
    .from(getPreStagingTable())
    .select(quoteColumnForSelect(getPreStagingIdColumn()), { count: "exact", head: true });
  revalidatePath("/admin/upload-merchant-db");
  return {
    success: true,
    dupCount,
    insertedCount,
    stagingCountAfter: stagingCountAfter ?? undefined,
    hasMore: remaining > 0,
    preStagingRemaining: remaining,
    preStagingCountAfter: preTotal ?? undefined,
  };
}

export interface StagingImportJobRow {
  id: string;
  sourceFilename: string | null;
  createdAt: string;
  preStagingCount: number;
  dupCount: number;
  insertedCount: number;
  status: string;
  /** Rows still in pre_staging for this job (only when status is pending). */
  preStagingRemaining?: number;
}

export interface ListStagingImportJobsResult {
  jobs: StagingImportJobRow[];
  error?: string;
}

/** Current row count in staging table (for display). Uses RPC when available for exact count over 50k. */
export async function getStagingCount(): Promise<{ count: number; error?: string }> {
  noStore();
  const supabase = getSupabaseServer();
  const tableName = getStagingTable();
  const { data, error } = await supabase.rpc("get_staging_count", { table_name: tableName });
  const rpcCount =
    data != null
      ? typeof data === "number"
        ? data
        : typeof data === "string"
          ? parseInt(data, 10)
          : Number(data)
      : null;
  if (!error && rpcCount !== null && Number.isFinite(rpcCount)) return { count: Math.floor(rpcCount) };
  const { count, error: selectError } = await supabase.from(tableName).select("*", { count: "exact", head: true });
  if (selectError) return { count: 0, error: selectError.message };
  return { count: count ?? 0 };
}

export interface SchemaCheckResult {
  ok: boolean;
  errors: string[];
}

/**
 * Sanity check: verify Pre_Staging and Staging tables have the columns the app expects.
 * Call on Upload merchant DB page load so schema issues surface before Process.
 */
export async function checkStagingPreStagingSchema(): Promise<SchemaCheckResult> {
  const supabase = getSupabaseServer();
  const errors: string[] = [];
  const preTable = getPreStagingTable();
  const preIdCol = getPreStagingIdColumn();
  const stagingTable = process.env.SUPABASE_STAGING_TABLE || "staging";
  const stagingIdCol = getStagingIdColumn();

  // Pre-Staging: must have PK column and import_job_id (quote PK if it has spaces, e.g. "Primary Key")
  const preSelect = quoteColumnForSelect(preIdCol) + ", import_job_id";
  const { error: preErr } = await supabase.from(preTable).select(preSelect).limit(0);
  if (preErr) {
    const msg = preErr.message ?? "";
    if (msg.includes("import_job_id") && msg.includes("does not exist")) {
      errors.push(`${preTable}: missing column "import_job_id". Run migration 012 (docs/migrations/012-pre-staging-add-import-job-id.sql).`);
    } else if (msg.includes(" does not exist")) {
      errors.push(`${preTable}: primary key column "${preIdCol}" not found. Set SUPABASE_PRE_STAGING_ID_COLUMN to your table's PK name (e.g. "Primary Key") or run migration 013.`);
    } else {
      errors.push(`${preTable}: ${msg}`);
    }
  }

  // Staging: must have PK column (quote if it has spaces)
  const { error: stErr } = await supabase.from(getStagingTable()).select(quoteColumnForSelect(stagingIdCol)).limit(0);
  if (stErr) {
    const msg = stErr.message ?? "";
    if (msg.includes(" does not exist")) {
      errors.push(`Staging (${stagingTable}): primary key column "${stagingIdCol}" not found. Set SUPABASE_STAGING_ID_COLUMN to your table's PK name (e.g. "Primary Key").`);
    } else {
      errors.push(`Staging (${stagingTable}): ${msg}`);
    }
  }

  // staging_import_job and staging_quarantine required for upload/process
  const { error: jobErr } = await supabase.from("staging_import_job").select("id").limit(0);
  if (jobErr) {
    errors.push(`staging_import_job: ${jobErr.message}. Run migration 006.`);
  }
  const { error: quarErr } = await supabase.from("staging_quarantine").select("import_job_id").limit(0);
  if (quarErr) {
    errors.push(`staging_quarantine: ${quarErr.message}. Run migration 006.`);
  }

  return { ok: errors.length === 0, errors };
}

function parseRpcCount(data: unknown): number | null {
  if (typeof data === "number" && Number.isFinite(data)) return data;
  if (typeof data === "string") return parseInt(data, 10) || 0;
  if (typeof data === "bigint") return Number(data);
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    if (typeof first === "number") return first;
    if (typeof first === "object" && first !== null) {
      const o = first as Record<string, unknown>;
      const v = o.get_pre_staging_count ?? o.count ?? Object.values(o)[0];
      if (typeof v === "number") return v;
      if (typeof v === "string") return parseInt(v, 10) || 0;
    }
  }
  if (data != null && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const v = o.get_pre_staging_count ?? o.count ?? Object.values(o)[0];
    if (typeof v === "number") return v;
    if (typeof v === "string") return parseInt(v, 10) || 0;
  }
  return null;
}

/** Current row count in pre_staging (unprocessed uploads). Uses RPC when available so count is correct even with RLS. */
export async function getPreStagingCount(): Promise<{ count: number; error?: string }> {
  const res = await getPreStagingCounts();
  return { count: res.count, error: res.error };
}

const PRE_STAGING_ALT_TABLE = "Pre_Staging";
const PRE_STAGING_DEFAULT_TABLE = "pre_staging";

function getOtherPreStagingTable(): string {
  const envTable = process.env.SUPABASE_OTHER_PRE_STAGING_TABLE;
  if (envTable != null && envTable.trim() !== "") return envTable.trim();
  const main = getPreStagingTable();
  return main === PRE_STAGING_ALT_TABLE ? PRE_STAGING_DEFAULT_TABLE : PRE_STAGING_ALT_TABLE;
}

function getOtherPreStagingIdColumn(): string {
  const c = process.env.SUPABASE_OTHER_PRE_STAGING_ID_COLUMN;
  return c != null && c.trim() !== "" ? c.trim() : "id";
}

/**
 * Pre-Staging counts for display: main table (from env) plus the other standard table when it exists (e.g. show both Pre_Staging and pre_staging).
 * preStagingTableName is the table used for upload and Normalize & dedupe; the other is shown for reference only.
 */
export async function getPreStagingCounts(): Promise<{
  count: number;
  error?: string;
  preStagingTableName: string;
  otherTableName?: string;
  otherCount?: number;
}> {
  noStore();
  const supabase = getSupabaseServer();
  const tableName = getPreStagingTable();
  const main = await countPreStagingTable(supabase, tableName);
  if (main.error) return { count: main.count, error: main.error, preStagingTableName: tableName };
  const otherName =
    tableName === PRE_STAGING_ALT_TABLE ? PRE_STAGING_DEFAULT_TABLE : tableName === PRE_STAGING_DEFAULT_TABLE ? PRE_STAGING_ALT_TABLE : undefined;
  if (!otherName) return { count: main.count, error: main.error, preStagingTableName: tableName };
  const other = await countPreStagingTable(supabase, otherName);
  return {
    count: main.count,
    error: main.error,
    preStagingTableName: tableName,
    otherTableName: otherName,
    otherCount: other.error ? undefined : other.count,
  };
}

async function countPreStagingTable(
  supabase: ReturnType<typeof getSupabaseServer>,
  tableName: string
): Promise<{ count: number; error?: string }> {
  // Prefer direct select count (same table path as insert/delete) so count always matches app state
  const { count, error: selectError } = await supabase
    .from(tableName)
    .select("*", { count: "exact", head: true });
  if (!selectError) return { count: count ?? 0 };
  // Fallback to RPC if direct count fails (e.g. RLS)
  const { data, error } = await supabase.rpc("get_pre_staging_count", { table_name: tableName });
  const rpcCount = parseRpcCount(data);
  if (!error && rpcCount !== null) return { count: rpcCount };
  return { count: 0, error: selectError.message };
}

/** Get primary key value from a row; API may return different key casings. */
function getPkFromRow(row: Record<string, unknown>, idCol: string): string | number | null {
  const v = row[idCol] ?? row["Primary Key"] ?? row["primary key"] ?? row["id"] ?? row["Id"];
  return v != null ? (v as string | number) : null;
}

/**
 * Process one batch from the other pre-staging table (e.g. Pre_Staging when main is pre_staging).
 * Uses select("*") so Pre_Staging column names (e.g. "Primary Key") don't have to match a fixed list.
 */
export async function processOtherPreStagingBatch(): Promise<ProcessStagingResult> {
  const supabase = getSupabaseServer();
  const otherTable = getOtherPreStagingTable();
  const otherIdCol = getOtherPreStagingIdColumn();
  const batchSize = getBatchSize();
  const stagingIdCol = getStagingIdColumn();
  const { data: preRows, error: preErr } = await supabase
    .from(otherTable)
    .select("*")
    .order(quoteColumnForSelect(otherIdCol), { ascending: true })
    .limit(batchSize);
  if (preErr) {
    const msg = preErr.message ?? "";
    if (msg.includes(" does not exist") || msg.includes("not found") || msg.includes("relation")) {
      return {
        success: false,
        error: `Other table "${otherTable}": ${msg}. If the table exists in Supabase, try SUPABASE_OTHER_PRE_STAGING_ID_COLUMN="Primary Key" (or your PK column name) in .env.local and restart.`,
      };
    }
    return { success: false, error: preErr.message };
  }
  const preStagingRows = (preRows ?? []) as unknown as Record<string, unknown>[];
  if (preStagingRows.length === 0) {
    const { count: otherTotal } = await supabase.from(otherTable).select("*", { count: "exact", head: true });
    revalidatePath("/admin/upload-merchant-db");
    return {
      success: true,
      dupCount: 0,
      insertedCount: 0,
      hasMore: false,
      preStagingRemaining: 0,
      otherPreStagingCountAfter: otherTotal ?? 0,
    };
  }
  const normalizedRows = preStagingRows.map((r) => normalizeStagingRow(r as Record<string, string | null>));
  const { data: stagingRows, error: stErr } = await supabase.from(getStagingTable()).select("*");
  if (stErr) return { success: false, error: stErr.message };
  const stagingList = (stagingRows ?? []) as unknown as Record<string, string | null>[];
  const emailToStagingId = new Map<string, string | number>();
  for (const row of stagingList) {
    const rowId = row[stagingIdCol] as string | number | undefined;
    if (rowId == null) continue;
    for (const col of EMAIL_COLUMNS) {
      if (!(col in row)) continue;
      const v = normalizeEmail(row[col]);
      if (v && !emailToStagingId.has(v)) emailToStagingId.set(v, rowId);
    }
  }
  const allowedStagingColumns = stagingList.length > 0 ? new Set<string>(Object.keys(stagingList[0])) : null;
  const dataCols = STAGING_DATA_COLUMNS as unknown as string[];
  let dupCount = 0;
  let insertedCount = 0;
  const processedIds: (string | number)[] = [];
  for (let i = 0; i < normalizedRows.length; i++) {
    const row = normalizedRows[i];
    const preRow = preStagingRows[i];
    const emails = getNormalizedEmails(row);
    let matchedStagingId: string | number | null = null;
    for (const e of emails) {
      const sid = emailToStagingId.get(e);
      if (sid != null) {
        matchedStagingId = sid;
        break;
      }
    }
    const stagingPayload: Record<string, unknown> = {};
    for (const c of dataCols) {
      if (allowedStagingColumns !== null && !allowedStagingColumns.has(c)) continue;
      const v = row[c];
      stagingPayload[c] = v ?? null;
    }
    const quarantinePayload = {
      import_job_id: null,
      quarantine_reason: "duplicate",
      original_staging_id: matchedStagingId,
      ...stagingPayload,
    };
    if (matchedStagingId != null) {
      const { error: qErr } = await supabase.from("staging_quarantine").insert(quarantinePayload);
      if (qErr) return { success: false, error: "Quarantine insert: " + qErr.message };
      dupCount++;
    } else {
      const { data: inserted, error: sErr } = await supabase
        .from(getStagingTable())
        .insert(stagingPayload)
        .select(quoteColumnForSelect(stagingIdCol))
        .single();
      if (sErr) return { success: false, error: "Staging insert: " + sErr.message };
      insertedCount++;
      const insertedRow = inserted as unknown as Record<string, unknown> | null;
      const newId = insertedRow?.[stagingIdCol] as string | number | undefined;
      if (newId != null) for (const e of emails) {
        if (!emailToStagingId.has(e)) emailToStagingId.set(e, newId);
      }
    }
    const pkVal = getPkFromRow(preRow, otherIdCol);
    if (pkVal != null) processedIds.push(pkVal);
  }
  if (processedIds.length > 0) {
    const DELETE_CHUNK = 25;
    const idsAsStrings = processedIds.map((id) => String(id));
    for (let i = 0; i < idsAsStrings.length; i += DELETE_CHUNK) {
      const chunk = idsAsStrings.slice(i, i + DELETE_CHUNK);
      let { error: deleteErr } = await supabase.from(otherTable).delete().in(otherIdCol, chunk);
      if (deleteErr && (otherIdCol.includes(" ") || otherIdCol !== otherIdCol.toLowerCase())) {
        const res = await supabase.from(otherTable).delete().in(quoteColumnForSelect(otherIdCol), chunk);
        deleteErr = res.error;
      }
      if (deleteErr) return { success: false, error: "Failed to remove processed rows from " + otherTable + ": " + deleteErr.message };
    }
  }
  const { count: otherRemaining } = await supabase.from(otherTable).select("*", { count: "exact", head: true });
  const { count: stagingCountAfter } = await supabase.from(getStagingTable()).select("*", { count: "exact", head: true });
  const { count: mainTotal } = await supabase.from(getPreStagingTable()).select("*", { count: "exact", head: true });
  revalidatePath("/admin/upload-merchant-db");
  return {
    success: true,
    dupCount,
    insertedCount,
    stagingCountAfter: stagingCountAfter ?? undefined,
    hasMore: (otherRemaining ?? 0) > 0,
    preStagingRemaining: otherRemaining ?? 0,
    preStagingCountAfter: mainTotal ?? undefined,
    otherPreStagingCountAfter: otherRemaining ?? undefined,
  };
}

/**
 * Process one batch from the selected pre-staging table(s). Run main table first (if selected), then other (if selected).
 */
export async function processSelectedPreStagingBatch(selected: {
  processMain: boolean;
  processOther: boolean;
}): Promise<ProcessStagingResult> {
  if (!selected.processMain && !selected.processOther) {
    return { success: false, error: "Select at least one table to process." };
  }
  if (selected.processMain && selected.processOther) {
    const mainResult = await processNextPreStagingBatch();
    if (!mainResult.success) return mainResult;
    const otherResult = await processOtherPreStagingBatch();
    return {
      success: otherResult.success,
      error: otherResult.error,
      dupCount: (mainResult.dupCount ?? 0) + (otherResult.dupCount ?? 0),
      insertedCount: (mainResult.insertedCount ?? 0) + (otherResult.insertedCount ?? 0),
      stagingCountAfter: otherResult.stagingCountAfter ?? mainResult.stagingCountAfter,
      hasMore: mainResult.hasMore === true || otherResult.hasMore === true,
      preStagingRemaining: mainResult.preStagingRemaining ?? 0,
      preStagingCountAfter: mainResult.preStagingCountAfter ?? otherResult.preStagingCountAfter,
      otherPreStagingCountAfter: otherResult.otherPreStagingCountAfter ?? otherResult.preStagingCountAfter,
    };
  }
  if (selected.processMain) return processNextPreStagingBatch();
  return processOtherPreStagingBatch();
}

/**
 * Process the next batch of Pre-Staging rows (picks any job that still has rows, or orphan rows with null import_job_id).
 * Use when Pre-Staging > 0 so the user has a CTA even if "Recent imports" is empty or the job isn't visible.
 */
export async function processNextPreStagingBatch(): Promise<ProcessStagingResult> {
  const supabase = getSupabaseServer();
  const idCol = getPreStagingIdColumn();
  const preTable = getPreStagingTable();
  const selectStr = quoteColumnForSelect(idCol) + ",import_job_id";
  const { data: row, error: findErr } = await supabase
    .from(getPreStagingTable())
    .select(selectStr)
    .limit(1)
    .maybeSingle();
  if (findErr) {
    const msg = findErr.message ?? "";
    if (msg.includes("import_job_id") && msg.includes("does not exist")) {
      return { success: false, error: 'Pre_Staging table is missing import_job_id. Run migration 012 (docs/migrations/012-pre-staging-add-import-job-id.sql) in Supabase SQL Editor.' };
    }
    if (msg.includes(" does not exist") && preTable === "Pre_Staging") {
      return {
        success: false,
        error: `Pre_Staging: primary key column "${idCol}" not found. Supabase/PostgREST often lowercases the table name, so "Pre_Staging" may hit the pre_staging table (which has column "id"). Try in .env.local: SUPABASE_PRE_STAGING_TABLE=pre_staging and SUPABASE_PRE_STAGING_ID_COLUMN=id to use that table, or use a DB view/alias so the mixed-case table is reachable. See docs/migrations/013.`,
      };
    }
    return { success: false, error: findErr.message };
  }
  const r = row as { import_job_id: string | null } | null;
  if (!r) return { success: true, dupCount: 0, insertedCount: 0, hasMore: false, preStagingRemaining: 0 };
  if (r.import_job_id != null) return processStagingImportJob(r.import_job_id);
  return processPreStagingOrphanBatch();
}

/**
 * Process a batch of Pre-Staging rows that have import_job_id = null (legacy/bulk uploads to Pre_Staging).
 * Same normalize/dedupe/insert/delete as job-based flow, but no staging_import_job row.
 */
async function processPreStagingOrphanBatch(): Promise<ProcessStagingResult> {
  const supabase = getSupabaseServer();
  const stagingTable = process.env.SUPABASE_STAGING_TABLE || "staging";
  const batchSize = getBatchSize();
  const idCol = getPreStagingIdColumn();
  const preSelect = quoteColumnForSelect(idCol) + ", " + STAGING_DATA_COLUMNS.map((c) => `"${c}"`).join(", ");
  const { data: preRows, error: preErr } = await supabase
    .from(getPreStagingTable())
    .select(preSelect)
    .is("import_job_id", null)
    .order(quoteColumnForSelect(idCol), { ascending: true })
    .limit(batchSize);
  if (preErr) {
    const msg = preErr.message ?? "";
    if (msg.includes(" does not exist") && getPreStagingTable() === "Pre_Staging") {
      return { success: false, error: `Pre_Staging primary key column not found. Set SUPABASE_PRE_STAGING_ID_COLUMN to your table's PK column name (e.g. "Primary Key" or Id). See docs/migrations/013.` };
    }
    return { success: false, error: preErr.message };
  }
  const preStagingRows = (preRows ?? []) as unknown as Record<string, unknown>[];
  if (preStagingRows.length === 0) {
    return { success: true, dupCount: 0, insertedCount: 0, hasMore: false, preStagingRemaining: 0 };
  }
  for (const preRow of preStagingRows) {
    const row = preRow as Record<string, string | null>;
    const normalized = normalizeStagingRow(row);
    const updatePayload: Record<string, unknown> = {};
    for (const col of STAGING_DATA_COLUMNS) {
      if (col in normalized) updatePayload[col] = normalized[col] ?? null;
    }
    const { error: updateErr } = await supabase.from(getPreStagingTable()).update(updatePayload).eq(quoteColumnForSelect(idCol), preRow[idCol]);
    if (updateErr) return { success: false, error: "Normalize update failed: " + updateErr.message };
  }
  const normalizedRows = preStagingRows.map((r) => normalizeStagingRow(r as Record<string, string | null>));
  const stagingIdCol = getStagingIdColumn();
  const { data: stagingRows, error: stErr } = await supabase.from(getStagingTable()).select("*");
  if (stErr) return { success: false, error: stErr.message };
  const stagingList = (stagingRows ?? []) as unknown as Record<string, string | null>[];
  const emailToStagingId = new Map<string, string | number>();
  for (const row of stagingList) {
    const rowId = row[stagingIdCol] as string | number | undefined;
    if (rowId == null) continue;
    for (const col of EMAIL_COLUMNS) {
      if (!(col in row)) continue;
      const v = normalizeEmail(row[col]);
      if (v && !emailToStagingId.has(v)) emailToStagingId.set(v, rowId);
    }
  }
  const allowedStagingColumns = stagingList.length > 0 ? new Set<string>(Object.keys(stagingList[0])) : null;

  let dupCount = 0;
  let insertedCount = 0;
  const dataCols = STAGING_DATA_COLUMNS as unknown as string[];
  const processedIds: (string | number)[] = [];
  for (let i = 0; i < normalizedRows.length; i++) {
    const row = normalizedRows[i];
    const preRow = preStagingRows[i];
    const emails = getNormalizedEmails(row);
    let matchedStagingId: string | number | null = null;
    for (const e of emails) {
      const sid = emailToStagingId.get(e);
      if (sid != null) {
        matchedStagingId = sid;
        break;
      }
    }
    const stagingPayload: Record<string, unknown> = {};
    for (const c of dataCols) {
      if (allowedStagingColumns !== null && !allowedStagingColumns.has(c)) continue;
      const v = row[c];
      stagingPayload[c] = v ?? null;
    }
    const quarantinePayload = {
      import_job_id: null,
      quarantine_reason: "duplicate",
      original_staging_id: matchedStagingId,
      ...stagingPayload,
    };
    if (matchedStagingId != null) {
      const { error: qErr } = await supabase.from("staging_quarantine").insert(quarantinePayload);
      if (qErr) return { success: false, error: "Quarantine insert: " + qErr.message };
      dupCount++;
    } else {
      const { data: inserted, error: sErr } = await supabase.from(getStagingTable()).insert(stagingPayload).select(quoteColumnForSelect(stagingIdCol)).single();
      if (sErr) return { success: false, error: "Staging insert: " + sErr.message };
      insertedCount++;
      const insertedRow = inserted as unknown as Record<string, unknown> | null;
      const newId = insertedRow?.[stagingIdCol] as string | number | undefined;
      if (newId != null) for (const e of emails) {
        if (!emailToStagingId.has(e)) emailToStagingId.set(e, newId);
      }
    }
    processedIds.push(preRow[idCol] as string | number);
  }
  const { error: deleteErr } = await supabase.from(getPreStagingTable()).delete().in(quoteColumnForSelect(idCol), processedIds);
  if (deleteErr) return { success: false, error: "Failed to remove processed rows: " + deleteErr.message };
  const { count: remaining } = await supabase
    .from(getPreStagingTable())
    .select(quoteColumnForSelect(idCol), { count: "exact", head: true })
    .is("import_job_id", null);
  const remainingCount = remaining ?? 0;
  const { count: stagingCountAfter } = await supabase.from(getStagingTable()).select("*", { count: "exact", head: true });
  const { count: preTotal } = await supabase
    .from(getPreStagingTable())
    .select(quoteColumnForSelect(idCol), { count: "exact", head: true });
  revalidatePath("/admin/upload-merchant-db");
  return {
    success: true,
    dupCount,
    insertedCount,
    stagingCountAfter: stagingCountAfter ?? undefined,
    hasMore: remainingCount > 0,
    preStagingRemaining: remainingCount,
    preStagingCountAfter: preTotal ?? undefined,
  };
}

/** Current row count in staging_quarantine (duplicates). */
export async function getQuarantineCount(): Promise<{ count: number; error?: string }> {
  const supabase = getSupabaseServer();
  const { count, error } = await supabase.from("staging_quarantine").select("*", { count: "exact", head: true });
  if (error) return { count: 0, error: error.message };
  return { count: count ?? 0 };
}

export async function listStagingImportJobs(limit = 20): Promise<ListStagingImportJobsResult> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("staging_import_job")
    .select("id, source_filename, created_at, pre_staging_count, dup_count, inserted_count, status")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    return { jobs: [], error: error.message };
  }
  const rows = data ?? [];
  const idCol = getPreStagingIdColumn();
  const remainingByJob = await Promise.all(
    rows.map(async (row) => {
      const { count } = await supabase
        .from(getPreStagingTable())
        .select(quoteColumnForSelect(idCol), { count: "exact", head: true })
        .eq("import_job_id", row.id);
      return { id: row.id, remaining: count ?? 0 };
    })
  );
  const remainingMap = new Map(remainingByJob.map((r) => [r.id, r.remaining]));
  const jobs = rows.map((row) => ({
    id: row.id,
    sourceFilename: row.source_filename ?? null,
    createdAt: row.created_at ?? "",
    preStagingCount: row.pre_staging_count ?? 0,
    dupCount: row.dup_count ?? 0,
    insertedCount: row.inserted_count ?? 0,
    status: row.status ?? "pending",
    preStagingRemaining: remainingMap.get(row.id),
  }));
  return { jobs };
}

/** Escape a value for CSV (wrap in quotes if needed, escape internal quotes). */
function csvEscape(val: string | null | undefined): string {
  const s = val == null ? "" : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Return quarantine rows for an import job as a CSV string (for download).
 * Columns: quarantine_reason, original_staging_id, then all staging data columns.
 */
export async function getQuarantineCsv(importJobId: string): Promise<{ success: boolean; error?: string; csv?: string }> {
  const supabase = getSupabaseServer();
  const cols = STAGING_DATA_COLUMNS.map((c) => `"${c}"`).join(", ");
  const { data: rows, error } = await supabase
    .from("staging_quarantine")
    .select(`quarantine_reason, original_staging_id, ${cols}`)
    .eq("import_job_id", importJobId);
  if (error) return { success: false, error: error.message };
  const list = (rows ?? []) as unknown as Record<string, string | number | null>[];
  const header = ["quarantine_reason", "original_staging_id", ...STAGING_DATA_COLUMNS];
  const lines = [header.map(csvEscape).join(",")];
  for (const row of list) {
    const cells = header.map((h) => csvEscape(row[h] != null ? String(row[h]) : ""));
    lines.push(cells.join(","));
  }
  return { success: true, csv: lines.join("\n") };
}

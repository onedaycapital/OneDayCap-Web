"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { getStagingIdColumn, getStagingTable, quoteColumnForSelect } from "@/lib/staging-config";

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
  const t = String(e).trim().toLowerCase();
  return t === "" ? "" : t;
}

function getEmailsFromRow(row: Record<string, unknown>): string[] {
  const set = new Set<string>();
  for (const col of EMAIL_COLUMNS) {
    const v = normalizeEmail(row[col] as string | null);
    if (v) set.add(v);
  }
  return Array.from(set);
}

export interface DuplicateEmailRow {
  id: string | number;
  businessName: string | null;
}

export interface DuplicateEmailGroup {
  email: string;
  rows: DuplicateEmailRow[];
}

export interface StagingDuplicateEmailsResult {
  success: boolean;
  error?: string;
  groups?: DuplicateEmailGroup[];
}

/**
 * Find emails in Staging that appear in more than one row (same person, multiple companies).
 * Returns groups of (email, rows) for the UI so the user can delete or merge.
 */
export async function getStagingDuplicateEmails(): Promise<StagingDuplicateEmailsResult> {
  const supabase = getSupabaseServer();
  const idCol = getStagingIdColumn();
  const cols = [idCol, "Business Name", ...EMAIL_COLUMNS].map((c) => `"${c}"`).join(", ");
  const { data: rows, error } = await supabase.from(getStagingTable()).select(cols);
  if (error) return { success: false, error: error.message };
  const list = (rows ?? []) as unknown as Record<string, unknown>[];
  const emailToRows = new Map<string, DuplicateEmailRow[]>();
  for (const row of list) {
    const id = row[idCol] as string | number;
    const businessName = (row["Business Name"] as string | null) ?? null;
    const entry: DuplicateEmailRow = { id, businessName };
    for (const email of getEmailsFromRow(row)) {
      if (!emailToRows.has(email)) emailToRows.set(email, []);
      const arr = emailToRows.get(email)!;
      if (!arr.some((r) => r.id === id)) arr.push(entry);
    }
  }
  const { data: dismissedRows } = await supabase
    .from("staging_duplicate_dismissed")
    .select("email");
  const dismissedSet = new Set((dismissedRows ?? []).map((r) => (r as { email: string }).email));

  const groups: DuplicateEmailGroup[] = [];
  Array.from(emailToRows.entries()).forEach(([email, rowsForEmail]) => {
    if (rowsForEmail.length > 1 && !dismissedSet.has(email)) {
      groups.push({ email, rows: rowsForEmail });
    }
  });
  groups.sort((a, b) => a.email.localeCompare(b.email));
  return { success: true, groups };
}

/**
 * Record "Do nothing" for this duplicate email so it won't show again in the report.
 */
export async function dismissStagingDuplicateEmail(email: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServer();
  const normalized = normalizeEmail(email);
  if (!normalized) return { success: false, error: "Invalid email." };
  const { error } = await supabase.from("staging_duplicate_dismissed").upsert({ email: normalized }, { onConflict: "email" });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Delete one row from Staging by id. Use after user chooses which duplicate to remove.
 */
export async function deleteStagingRow(id: string | number): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServer();
  const idCol = getStagingIdColumn();
  const { error } = await supabase.from(getStagingTable()).delete().eq(quoteColumnForSelect(idCol), id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Build a map of normalized email -> { phone, revenue, city } from Staging (Merchant DB).
 * Used to enrich the funnel digest report with Staging columns when available.
 */

import { getSupabaseServer } from "@/lib/supabase-server";
import { log, LOG_SCOPE } from "@/lib/log";

const STAGING_TABLE = process.env.SUPABASE_STAGING_TABLE || "staging";

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

function normalize(email: string): string {
  return email?.trim().toLowerCase() || "";
}

export interface StagingContactInfo {
  phone: string;
  revenue: string;
  city: string;
}

/**
 * Returns a map from normalized email to Staging contact info (Phone 1, Monthly Revenue, City).
 * Each Staging row can contribute for up to 11 emails (all email columns).
 */
export async function getStagingContactMap(): Promise<Map<string, StagingContactInfo>> {
  const map = new Map<string, StagingContactInfo>();
  try {
    const supabase = getSupabaseServer();
    const selectCols = [
      ...EMAIL_COLUMNS,
      "Phone 1",
      "Monthly Revenue",
      "City",
    ].map((c) => `"${c}"`).join(", ");
    const { data, error } = await supabase.from(STAGING_TABLE).select(selectCols);
    if (error) {
      log.error(LOG_SCOPE.STAGING_MAP, "Staging select failed", error);
      return map;
    }
    const rows = ((data ?? []) as unknown) as Record<string, string | null>[];
    for (const row of rows) {
      const phone = (row["Phone 1"] ?? row["phone 1"] ?? "")?.toString().trim() ?? "";
      const revenue = (row["Monthly Revenue"] ?? row["monthly revenue"] ?? "")?.toString().trim() ?? "";
      const city = (row["City"] ?? row["city"] ?? "")?.toString().trim() ?? "";
      const info: StagingContactInfo = { phone, revenue, city };
      for (const col of EMAIL_COLUMNS) {
        const val = row[col];
        const e = typeof val === "string" ? val.trim() : "";
        if (e) {
          const key = normalize(e);
          if (key && !map.has(key)) map.set(key, info);
        }
      }
    }
  } catch (e) {
    log.error(LOG_SCOPE.STAGING_MAP, "getStagingContactMap failed", e);
  }
  return map;
}

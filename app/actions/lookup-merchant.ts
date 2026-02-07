"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import type { PersonalInfo } from "@/components/apply-form/types";
import type { BusinessInfo } from "@/components/apply-form/types";
import type { FinancialFundingInfo } from "@/components/apply-form/types";
import type { PersonalCreditOwnership } from "@/components/apply-form/types";

const STAGING_TABLE = process.env.SUPABASE_STAGING_TABLE || "staging";

/** Postgres lowercases unquoted identifiers; try both if env is "Staging". */
const STAGING_TABLE_ALT = STAGING_TABLE === "Staging" ? "staging" : STAGING_TABLE === "staging" ? "Staging" : null;

/** All Staging columns that may contain a merchant email; match is tried in this order. */
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
];

/** Normalize row: keep original keys and add lowercase so "First Name" and "first name" both work. */
function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = v;
    if (k !== k.toLowerCase()) out[k.toLowerCase()] = v;
  }
  return out;
}

/** Turn "First Name" into variants: First Name, first name, first_name, First_Name, FirstName, firstName. */
function columnVariants(displayName: string): string[] {
  const lower = displayName.toLowerCase();
  const snake = displayName.replace(/\s+/g, "_");
  const snakeLower = lower.replace(/\s+/g, "_");
  const noSpace = displayName.replace(/\s+/g, "");
  const noSpaceLower = lower.replace(/\s+/g, "");
  const camel = noSpaceLower.charAt(0).toLowerCase() + noSpaceLower.slice(1);
  const set = new Set([displayName, lower, snake, snakeLower, noSpace, noSpaceLower, camel]);
  return Array.from(set);
}

/** Try multiple possible column names from Staging; return first non-null string. */
function pick(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && typeof v === "string") return v.trim();
    if (v != null && typeof v === "number") return String(v);
  }
  return "";
}

/** Pick using common column name variants (spaces, snake_case, camelCase, etc.). Tries each displayName in order. */
function pickCol(row: Record<string, unknown>, ...displayNames: string[]): string {
  for (const name of displayNames) {
    const val = pick(row, ...columnVariants(name));
    if (val) return val;
  }
  return "";
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** From Staging "Business Start Date" (full date or partial), return form format "Mon, YYYY" (e.g. Aug, 2012). */
function businessStartDateToMonthYear(row: Record<string, unknown>): string {
  const raw = pickCol(row, "Business Start Date");
  if (!raw) return "";
  const existing = raw.match(/^([A-Za-z]+),\s*(\d{4})$/);
  if (existing) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${month}, ${year}`;
}

/** Map a raw Staging row to form sections. Tries multiple column name variants (spaces, snake_case, etc.). SSN never included. */
function mapStagingRowToForm(row: Record<string, unknown>): {
  personal: Partial<PersonalInfo>;
  business: Partial<BusinessInfo>;
  financial: Partial<FinancialFundingInfo>;
  creditOwnership: Partial<Omit<PersonalCreditOwnership, "ssn">>;
} {
  return {
    personal: {
      firstName: pickCol(row, "First Name"),
      lastName: pickCol(row, "Last Name"),
      phone: pickCol(row, "Phone 1", "Phone"),
    },
    business: {
      businessName: pickCol(row, "Business Name"),
      startDateOfBusiness: businessStartDateToMonthYear(row),
      ein: pickCol(row, "EIN"),
      address: pickCol(row, "Address Street", "Address", "Street"),
      city: pickCol(row, "City"),
      state: pickCol(row, "State"),
      zip: pickCol(row, "ZIP", "Zip"),
      industry: pickCol(row, "Business Type", "Industry"),
    },
    financial: {
      monthlyRevenue: pickCol(row, "Monthly Revenue", "Revenue"),
    },
    creditOwnership: {
      address: pickCol(row, "Home Address", "Owner Address"),
      city: pickCol(row, "City 2", "Owner City"),
      state: pickCol(row, "State 2", "Owner State"),
      zip: pickCol(row, "ZIP 2", "Owner Zip"),
    },
  };
}

/** Row from merchant_applications (snake_case). SSN never included in prefill. */
type MerchantApplicationRow = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  sms_consent?: boolean | null;
  business_name?: string | null;
  dba?: string | null;
  type_of_business?: string | null;
  start_date_of_business?: string | null;
  ein?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  industry?: string | null;
  monthly_revenue?: string | null;
  funding_request?: string | null;
  use_of_funds?: string | null;
  owner_address?: string | null;
  owner_city?: string | null;
  owner_state?: string | null;
  owner_zip?: string | null;
  ownership_percent?: string | null;
};

function str(val: string | null | undefined): string {
  return val != null && typeof val === "string" ? val.trim() : "";
}

/** Map a merchant_applications row to form sections. Used for returning applicants; SSN is never prefilled. */
function mapMerchantApplicationToForm(row: MerchantApplicationRow): {
  personal: Partial<PersonalInfo>;
  business: Partial<BusinessInfo>;
  financial: Partial<FinancialFundingInfo>;
  creditOwnership: Partial<Omit<PersonalCreditOwnership, "ssn">>;
} {
  return {
    personal: {
      firstName: str(row.first_name),
      lastName: str(row.last_name),
      phone: str(row.phone),
      smsConsent: row.sms_consent ?? false,
    },
    business: {
      businessName: str(row.business_name),
      dba: str(row.dba),
      typeOfBusiness: str(row.type_of_business),
      startDateOfBusiness: str(row.start_date_of_business),
      ein: str(row.ein),
      address: str(row.address),
      city: str(row.city),
      state: str(row.state),
      zip: str(row.zip),
      industry: str(row.industry),
    },
    financial: {
      monthlyRevenue: str(row.monthly_revenue),
      fundingRequest: str(row.funding_request),
      useOfFunds: str(row.use_of_funds),
    },
    creditOwnership: {
      address: str(row.owner_address),
      city: str(row.owner_city),
      state: str(row.owner_state),
      zip: str(row.owner_zip),
      ownershipPercent: str(row.ownership_percent),
    },
  };
}

export type LookupResult =
  | { found: true; personal: Partial<PersonalInfo>; business: Partial<BusinessInfo>; financial: Partial<FinancialFundingInfo>; creditOwnership: Partial<Omit<PersonalCreditOwnership, "ssn">> }
  | { found: false; debug?: string };

function isRelationNotFound(error: { message?: string; code?: string }): boolean {
  const m = (error.message || "").toLowerCase();
  return m.includes("relation") && (m.includes("does not exist") || m.includes("not found")) || error.code === "42P01";
}

/** PostgREST strips spaces from unquoted column names; quote so "Email 1" is sent correctly. */
function quoteColumnIfNeeded(col: string): string {
  return col.includes(" ") ? `"${col}"` : col;
}

/** All variants to try for each logical email column (for client fallback). */
function emailFilterColumnVariants(logicalName: string): string[] {
  const variants = columnVariants(logicalName);
  const withQuoted = variants.map(quoteColumnIfNeeded).concat(variants);
  return Array.from(new Set(withQuoted));
}

export async function lookupMerchantByEmail(email: string): Promise<LookupResult> {
  const trimmed = email?.trim();
  if (!trimmed) return { found: false, debug: "No email provided." };

  console.log("[Staging lookup] called for:", trimmed);
  const supabase = getSupabaseServer();

  try {
    // 1) RPC path (99% reliable): single round-trip, no column-name guessing. Use when you've run docs/supabase-staging-lookup-rpc.sql.
    const { data: rpcData, error: rpcError } = await supabase
      .rpc("get_staging_merchant_by_email", { lookup_email: trimmed })
      .maybeSingle();

    if (!rpcError && rpcData && typeof rpcData === "object") {
      const row = normalizeRow(rpcData as Record<string, unknown>);
      const mapped = mapStagingRowToForm(row);
      console.log("[Staging lookup] RPC returned a row for email (prefill applied).");
      return {
        found: true,
        personal: mapped.personal,
        business: mapped.business,
        financial: mapped.financial,
        creditOwnership: mapped.creditOwnership,
      };
    }
    if (rpcError) {
      const fnNotFound =
        rpcError.code === "42883" ||
        ((rpcError.message || "").toLowerCase().includes("function") && (rpcError.message || "").toLowerCase().includes("does not exist"));
      if (!fnNotFound) {
        console.error("[Staging lookup] RPC error:", rpcError.message);
        return { found: false, debug: `Staging lookup failed: ${rpcError.message}` };
      }
      console.log("[Staging lookup] RPC not found, trying client fallback.");
    } else if (rpcData === null || rpcData === undefined) {
      console.log("[Staging lookup] RPC returned no row, trying client fallback for:", trimmed);
    }

    // 2) Client fallback: try each email column (and variants + quoted) until we get a row.
    let firstError: string | null = null;
    const tablesToTry = [STAGING_TABLE, ...(STAGING_TABLE_ALT ? [STAGING_TABLE_ALT] : [])];

    for (const tableName of tablesToTry) {
      let relationNotFound = false;
      for (const emailCol of EMAIL_COLUMNS) {
        if (relationNotFound) break;
        for (const col of emailFilterColumnVariants(emailCol)) {
          const { data, error } = await supabase
            .from(tableName)
            .select("*")
            .ilike(col, trimmed)
            .limit(1)
            .maybeSingle();

          if (error) {
            if (!firstError) firstError = `Staging lookup (${emailCol}): ${error.message}`;
            if (isRelationNotFound(error)) {
              relationNotFound = true;
              break;
            }
            continue;
          }
          if (data && typeof data === "object") {
            const row = normalizeRow(data as Record<string, unknown>);
            const mapped = mapStagingRowToForm(row);
            console.log("[Staging lookup] Client fallback found row from table", tableName, "column", col);
            return {
              found: true,
              personal: mapped.personal,
              business: mapped.business,
              financial: mapped.financial,
              creditOwnership: mapped.creditOwnership,
            };
          }
          break;
        }
      }
    }

    // 3) Fallback: returning applicant — lookup in merchant_applications by email (most recent first)
    const { data: appRow, error: appError } = await supabase
      .from("merchant_applications")
      .select("*")
      .ilike("email", trimmed)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!appError && appRow && typeof appRow === "object") {
      const mapped = mapMerchantApplicationToForm(appRow as MerchantApplicationRow);
      console.log("[Lookup] Found returning applicant in merchant_applications (prefill applied).");
      return {
        found: true,
        personal: mapped.personal,
        business: mapped.business,
        financial: mapped.financial,
        creditOwnership: mapped.creditOwnership,
      };
    }
    if (appError) {
      console.error("[Lookup] merchant_applications query error:", appError.message);
    }

    console.log("[Staging lookup] No row found in Staging or merchant_applications. First error:", firstError || "none");
    return { found: false, debug: firstError || "No matching row in Staging or merchant_applications for this email." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("lookupMerchantByEmail error:", err);
    return { found: false, debug: msg };
  }
}

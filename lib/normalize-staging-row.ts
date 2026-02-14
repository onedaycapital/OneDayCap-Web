/**
 * Normalize staging/pre_staging row values before dedupe and move to staging.
 * - SSN: XXX-XX-XXXX (9 digits)
 * - EIN: XX-XXXXXXX (9 digits, 2+7)
 * - Email: lowercase, trim
 * - Phone: digits only, no country code (10 digits: strip leading 1 if 11 digits)
 */

function digitsOnly(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s).replace(/\D/g, "");
}

/** SSN: XXX-XX-XXXX from 9 digits. */
export function normalizeSSN(val: string | null | undefined): string | null {
  const d = digitsOnly(val);
  if (d.length === 0) return null;
  if (d.length !== 9) return d.length > 0 ? d : null; // leave as digits if not 9, or return null if empty
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5, 9)}`;
}

/** EIN: XX-XXXXXXX from 9 digits. */
export function normalizeEIN(val: string | null | undefined): string | null {
  const d = digitsOnly(val);
  if (d.length === 0) return null;
  if (d.length !== 9) return d.length > 0 ? d : null;
  return `${d.slice(0, 2)}-${d.slice(2, 9)}`;
}

/** Email: lowercase, trim. Empty string -> null. */
export function normalizeEmailStored(val: string | null | undefined): string | null {
  if (val == null) return null;
  const t = String(val).trim().toLowerCase();
  return t === "" ? null : t;
}

/** Phone: digits only, no country code. If 11 digits and starts with 1, use last 10. Result 10 digits or null. */
export function normalizePhone(val: string | null | undefined): string | null {
  const d = digitsOnly(val);
  if (d.length === 0) return null;
  if (d.length === 11 && d[0] === "1") return d.slice(1);
  if (d.length === 10) return d;
  return d.length > 0 ? d : null; // store as-is if not 10/11
}

const EMAIL_COLS = [
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

export function normalizeStagingRow<T extends Record<string, string | null>>(row: T): T {
  const out = { ...row } as T;
  for (const col of EMAIL_COLS) {
    if (col in out) {
      (out as Record<string, string | null>)[col] = normalizeEmailStored(out[col as keyof T] as string | null);
    }
  }
  if ("Phone 1" in out) {
    (out as Record<string, string | null>)["Phone 1"] = normalizePhone(out["Phone 1" as keyof T] as string | null);
  }
  if ("EIN" in out) {
    (out as Record<string, string | null>)["EIN"] = normalizeEIN(out["EIN" as keyof T] as string | null);
  }
  if ("SSN" in out) {
    (out as Record<string, string | null>)["SSN"] = normalizeSSN(out["SSN" as keyof T] as string | null);
  }
  return out;
}

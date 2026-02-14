/**
 * Staging / Pre-staging table and column names from env. Shared by server actions; no "use server".
 */

/** Pre-staging table name. Env SUPABASE_PRE_STAGING_TABLE (e.g. Pre_Staging) or default pre_staging. */
export function getPreStagingTable(): string {
  const t = process.env.SUPABASE_PRE_STAGING_TABLE;
  return t != null && t.trim() !== "" ? t.trim() : "pre_staging";
}

/** Pre-staging table primary key column name. Env SUPABASE_PRE_STAGING_ID_COLUMN (e.g. "Primary Key" or Id) or default id. */
export function getPreStagingIdColumn(): string {
  const c = process.env.SUPABASE_PRE_STAGING_ID_COLUMN;
  return c != null && c.trim() !== "" ? c.trim() : "id";
}

/** Staging table name. Env SUPABASE_STAGING_TABLE or default staging. */
export function getStagingTable(): string {
  const t = process.env.SUPABASE_STAGING_TABLE;
  return t != null && t.trim() !== "" ? t.trim() : "staging";
}

/** Staging table primary key column name. Env SUPABASE_STAGING_ID_COLUMN (e.g. "Primary Key") or default id. */
export function getStagingIdColumn(): string {
  const c = process.env.SUPABASE_STAGING_ID_COLUMN;
  return c != null && c.trim() !== "" ? c.trim() : "id";
}

/** For use in .select() strings: quote column name if it contains space/comma/mixed case so PostgREST parses it as one column. */
export function quoteColumnForSelect(col: string): string {
  if (/[\s,]/.test(col) || col !== col.toLowerCase()) return `"${col.replace(/"/g, '""')}"`;
  return col;
}


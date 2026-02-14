/**
 * Staging / pre_staging column names (same as deploy-merchant-db staging table).
 * Used for CSV header mapping and row inserts.
 */
export const STAGING_DATA_COLUMNS = [
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
  "First Name",
  "Last Name",
  "Phone 1",
  "Business Name",
  "Business Start Date",
  "EIN",
  "SSN",
  "Address Street",
  "City",
  "State",
  "ZIP",
  "Business Type",
  "Monthly Revenue",
  "Home Address",
  "City 2",
  "State 2",
  "ZIP 2",
] as const;

/** Normalize CSV header for matching: lowercase, trim, collapse spaces. */
function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Map flexible CSV header -> canonical column name. */
const HEADER_TO_COLUMN: Record<string, (typeof STAGING_DATA_COLUMNS)[number]> = {};
for (const col of STAGING_DATA_COLUMNS) {
  HEADER_TO_COLUMN[normalizeHeader(col)] = col;
  // Also allow without space (e.g. "email1" -> "Email 1")
  const noSpace = col.replace(/\s/g, "");
  if (!HEADER_TO_COLUMN[noSpace]) {
    HEADER_TO_COLUMN[noSpace.toLowerCase()] = col;
  }
}

/**
 * Map a CSV record (object with arbitrary header keys) to a row with only canonical staging column names.
 * Trims string values; leaves unmapped keys out.
 */
export function mapCsvRecordToStagingRow(
  record: Record<string, string | undefined>
): Record<string, string | null> {
  const row: Record<string, string | null> = {};
  for (const col of STAGING_DATA_COLUMNS) {
    row[col] = null;
  }
  for (const [key, value] of Object.entries(record)) {
    const canonical = HEADER_TO_COLUMN[normalizeHeader(key)];
    if (canonical != null && value !== undefined) {
      const trimmed = typeof value === "string" ? value.trim() || null : null;
      row[canonical] = trimmed;
    }
  }
  return row;
}

/**
 * Format and validate EIN (xx-xxxxxxx) and SSN (xxx-xx-xxxx).
 * Accept input with or without dashes; store and display with dashes.
 */

export function getDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Format as EIN: xx-xxxxxxx (9 digits) */
export function formatEIN(value: string): string {
  const digits = getDigits(value).slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

/** Format as SSN: xxx-xx-xxxx (9 digits) */
export function formatSSN(value: string): string {
  const digits = getDigits(value).slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function einDigitCount(value: string): number {
  return getDigits(value).length;
}

export function ssnDigitCount(value: string): number {
  return getDigits(value).length;
}

/** Parse funding request input to digits-only string (for storage and calculations). */
export function parseFundingRequest(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits;
}

/** Format funding request as USD with 0 decimals, e.g. $65,000. */
export function formatFundingRequestCurrency(value: string | null | undefined): string {
  const digits = parseFundingRequest(value);
  if (digits === "") return "";
  const n = parseInt(digits, 10);
  if (Number.isNaN(n)) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

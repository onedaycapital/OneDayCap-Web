import { createHash } from "crypto";

const COOKIE_NAME = "admin_session";
const SALT = "onedaycap-admin";

/** Compute the token we store in the cookie when password is correct. */
export function getExpectedToken(): string | null {
  const raw = process.env.ADMIN_PASSWORD;
  const password = typeof raw === "string" ? raw.trim() : "";
  if (!password) return null;
  return createHash("sha256").update(password + SALT).digest("hex");
}

/** Check if the cookie value is valid (matches current ADMIN_PASSWORD). */
export function isTokenValid(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const expected = getExpectedToken();
  return expected !== null && cookieValue === expected;
}

/** Verify that the given password matches ADMIN_PASSWORD. */
export function verifyPassword(password: string): boolean {
  const expected = getExpectedToken();
  if (!expected) return false;
  const token = createHash("sha256").update(password.trim() + SALT).digest("hex");
  return token === expected;
}

export { COOKIE_NAME };

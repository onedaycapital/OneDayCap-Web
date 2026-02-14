import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_PATH = "/admin";
const LOGIN_PATH = "/admin/login";
const COOKIE_NAME = "admin_session";
const SALT = "onedaycap-admin";

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith(ADMIN_PATH)) {
    return NextResponse.next();
  }
  const rawPassword = process.env.ADMIN_PASSWORD;
  const password = typeof rawPassword === "string" ? rawPassword.trim() : "";
  if (pathname === LOGIN_PATH) {
    const cookie = request.cookies.get(COOKIE_NAME)?.value;
    if (!password) {
      return NextResponse.next();
    }
    const expected = await sha256Hex(password + SALT);
    if (cookie === expected) {
      return NextResponse.redirect(new URL(ADMIN_PATH, request.url));
    }
    return NextResponse.next();
  }
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!password) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }
  const expected = await sha256Hex(password + SALT);
  if (cookie !== expected) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

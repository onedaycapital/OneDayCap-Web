"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getExpectedToken, verifyPassword, COOKIE_NAME } from "@/lib/admin-auth";

const ADMIN_PATH = "/admin";
const LOGIN_PATH = "/admin/login";

export async function login(formData: FormData): Promise<void> {
  const password = formData.get("password");
  const expected = getExpectedToken();
  if (!expected) {
    redirect(LOGIN_PATH + "?error=" + encodeURIComponent("Admin login is not configured (ADMIN_PASSWORD missing)."));
  }
  if (typeof password !== "string" || password.trim() === "") {
    redirect(LOGIN_PATH + "?error=" + encodeURIComponent("Enter the admin password."));
  }
  if (!verifyPassword(password)) {
    redirect(LOGIN_PATH + "?error=" + encodeURIComponent("Invalid password."));
  }
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: ADMIN_PATH,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: "lax",
  });
  redirect(ADMIN_PATH);
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect(LOGIN_PATH);
}

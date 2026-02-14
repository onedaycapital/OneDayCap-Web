"use client";

import { useSearchParams } from "next/navigation";
import { login } from "@/app/actions/admin-auth";

export function AdminLoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-800 mb-4">Admin login</h1>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>
        )}
        <form action={login} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--brand-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)]"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--brand-blue)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:ring-offset-2"
          >
            Sign in
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-500">
          OneDay Capital internal only. Add ADMIN_PASSWORD to .env.local, then restart the dev server (npm run dev).
        </p>
      </div>
    </div>
  );
}

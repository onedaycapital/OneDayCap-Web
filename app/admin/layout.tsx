import Link from "next/link";
import { logout } from "@/app/actions/admin-auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/admin" className="font-medium text-slate-800 hover:text-[var(--brand-blue)]">
              Dashboard
            </Link>
            <Link href="/admin/applications" className="text-slate-600 hover:text-[var(--brand-blue)]">
              Applications
            </Link>
            <Link href="/admin/funders" className="text-slate-600 hover:text-[var(--brand-blue)]">
              Funders
            </Link>
            <Link href="/admin/upload-contract" className="text-slate-600 hover:text-[var(--brand-blue)]">
              Upload contract/guidelines
            </Link>
            <Link href="/admin/upload-merchant-db" className="text-slate-600 hover:text-[var(--brand-blue)]">
              Upload merchant DB
            </Link>
            <Link href="/admin/reports" className="text-slate-600 hover:text-[var(--brand-blue)]">
              Reports
            </Link>
            <Link href="/admin/duplicate-emails" className="text-slate-600 hover:text-[var(--brand-blue)]">
              Duplicate emails
            </Link>
          </nav>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

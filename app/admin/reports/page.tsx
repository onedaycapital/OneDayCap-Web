import Link from "next/link";
import { getApplicationActivityReport } from "@/app/actions/admin-reports";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const report = await getApplicationActivityReport();
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-4">Reports</h1>
      <p className="text-slate-600 text-sm mb-6">
        Application activity from merchant_applications. Counts by day and last 7 days; current totals for submitted and pending documents.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Daily (today)</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Applications created</dt>
              <dd className="font-medium text-slate-800">{report.daily.createdToday}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Submitted (status)</dt>
              <dd className="font-medium text-slate-800">{report.daily.submittedToday}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Weekly (last 7 days)</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Applications created</dt>
              <dd className="font-medium text-slate-800">{report.weekly.createdLast7Days}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Submitted (status)</dt>
              <dd className="font-medium text-slate-800">{report.weekly.submittedLast7Days}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Current totals</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Total submitted</dt>
            <dd className="font-medium text-slate-800">{report.totals.totalSubmitted}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Pending documents</dt>
            <dd className="font-medium text-slate-800">{report.totals.totalPendingDocuments}</dd>
          </div>
        </dl>
      </section>

      <p className="mt-6 space-x-4">
        <Link href="/admin/duplicate-emails" className="text-[var(--brand-blue)] hover:underline">
          Duplicate emails in Staging →
        </Link>
        <Link href="/admin" className="text-[var(--brand-blue)] hover:underline">
          ← Dashboard
        </Link>
      </p>
    </div>
  );
}

import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-4">Admin dashboard</h1>
      <p className="text-slate-600 mb-6">
        Phase 1: applications, funders, contract/guideline upload, merchant DB upload, and activity reports.
      </p>
      <ul className="grid gap-2 text-sm">
        <li>
          <Link href="/admin/applications" className="text-[var(--brand-blue)] hover:underline">
            Applications
          </Link>
          {" – List and search merchant applications."}
        </li>
        <li>
          <Link href="/admin/funders" className="text-[var(--brand-blue)] hover:underline">
            Funders
          </Link>
          {" – List funders; upload contracts/guidelines and extract to DB."}
        </li>
        <li>
          <Link href="/admin/upload-contract" className="text-[var(--brand-blue)] hover:underline">
            Upload contract / guidelines
          </Link>
          {" – PDF upload, LLM extract, populate funder_guidelines."}
        </li>
        <li>
          <Link href="/admin/upload-merchant-db" className="text-[var(--brand-blue)] hover:underline">
            Upload merchant DB
          </Link>
          {" – CSV to Pre-Staging; normalize, dedupe, quarantine; show counts."}
        </li>
        <li>
          <Link href="/admin/reports" className="text-[var(--brand-blue)] hover:underline">
            Reports
          </Link>
          {" – Daily and weekly application activity."}
        </li>
      </ul>
      <p className="mt-6 text-sm text-slate-500">
        <Link href="/submit-to-funders" className="text-[var(--brand-blue)] hover:underline">
          Submit application to funders
        </Link>
        {" (existing internal tool)."}
      </p>
    </div>
  );
}

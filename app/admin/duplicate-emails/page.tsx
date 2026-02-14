import Link from "next/link";
import { getStagingDuplicateEmails } from "@/app/actions/admin-duplicate-emails";
import { DuplicateEmailsClient } from "./DuplicateEmailsClient";

export const dynamic = "force-dynamic";

export default async function AdminDuplicateEmailsPage() {
  const result = await getStagingDuplicateEmails();
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-4">Duplicate emails in Staging</h1>
      <p className="text-slate-600 text-sm mb-4">
        Emails that appear in more than one Staging row (e.g. same person, multiple companies). Review and delete the row you don’t want to keep, or merge manually.
      </p>
      {result.success === false && (
        <p className="text-red-600 text-sm mb-4">{result.error}</p>
      )}
      <DuplicateEmailsClient groups={result.groups ?? []} error={result.error} />
      <p className="mt-6">
        <Link href="/admin" className="text-[var(--brand-blue)] hover:underline">
          ← Dashboard
        </Link>
      </p>
    </div>
  );
}

import Link from "next/link";
import { listApplicationsForAdmin } from "@/app/actions/admin-applications";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  let applications: Awaited<ReturnType<typeof listApplicationsForAdmin>>;
  try {
    applications = await listApplicationsForAdmin({ limit: 100 });
  } catch (e) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-800 mb-4">Applications</h1>
        <p className="text-slate-600 text-sm mb-4">
          Could not load applications. Check the server console for details.
        </p>
        <Link href="/admin" className="text-[var(--brand-blue)] hover:underline">
          ← Dashboard
        </Link>
      </div>
    );
  }
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-4">Applications</h1>
      <p className="text-slate-600 text-sm mb-4">
        Recent merchant applications. Use Submit to funders to email an application.
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Business</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Email</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700">State</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Status</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Created</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No applications yet.
                </td>
              </tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-800">{app.businessName}</td>
                  <td className="px-4 py-2 text-slate-600">{app.email}</td>
                  <td className="px-4 py-2 text-slate-600">{app.state ?? "–"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        app.submissionStatus === "submitted"
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }
                    >
                      {app.submissionStatus ?? "–"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href="/submit-to-funders"
                      className="text-[var(--brand-blue)] hover:underline"
                    >
                      Submit to funders
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

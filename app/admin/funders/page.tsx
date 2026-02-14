import Link from "next/link";
import { listFundersForAdmin } from "@/app/actions/admin-funders";

export const dynamic = "force-dynamic";

export default async function AdminFundersPage() {
  const funders = await listFundersForAdmin();
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-4">Funders</h1>
      <p className="text-slate-600 text-sm mb-4">
        Upload contracts and guidelines from the Upload contract/guidelines page to populate guidelines.
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Name</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Status</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700">ISO signed</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Contact</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Min / Max funding</th>
            </tr>
          </thead>
          <tbody>
            {funders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No funders yet.
                </td>
              </tr>
            ) : (
              funders.map((f) => (
                <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-800">{f.name}</td>
                  <td className="px-4 py-2 text-slate-600">{f.relationshipStatus}</td>
                  <td className="px-4 py-2">
                    {f.isoAgreementSigned ? (
                      <span className="text-emerald-600">Yes</span>
                    ) : (
                      <span className="text-slate-400">No</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{f.email ?? "–"}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {f.minFunding != null || f.maxFunding != null
                      ? `${f.minFunding != null ? `$${Number(f.minFunding).toLocaleString()}` : "–"} / ${f.maxFunding != null ? `$${Number(f.maxFunding).toLocaleString()}` : "–"}`
                      : "–"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm">
        <Link href="/admin/upload-contract" className="text-[var(--brand-blue)] hover:underline">
          Upload contract or guidelines (PDF) →
        </Link>
      </p>
    </div>
  );
}

import Link from "next/link";
import { listFundersForAdmin } from "@/app/actions/admin-funders";
import { UploadContractClient } from "./UploadContractClient";

export const dynamic = "force-dynamic";

export default async function AdminUploadContractPage() {
  const funders = await listFundersForAdmin();
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-4">Upload contract / guidelines</h1>
      <p className="text-slate-600 text-sm mb-6">
        Upload a PDF (ISO contract or funder guidelines). We extract structured data with OpenAI, then you review and save to funders and funder_guidelines.
      </p>
      <UploadContractClient funders={funders} />
      <p className="mt-4">
        <Link href="/admin" className="text-[var(--brand-blue)] hover:underline">
          ← Dashboard
        </Link>
      </p>
    </div>
  );
}

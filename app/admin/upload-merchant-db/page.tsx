import Link from "next/link";
import {
  listStagingImportJobs,
  getStagingCount,
  getPreStagingCounts,
  getQuarantineCount,
  checkStagingPreStagingSchema,
} from "@/app/actions/admin-staging-import";
import { UploadMerchantDbClient } from "./UploadMerchantDbClient";

export const dynamic = "force-dynamic";

export default async function AdminUploadMerchantDbPage() {
  const [
    { jobs, error: listError },
    { count: stagingCount, error: stagingCountError },
    preStagingCounts,
    { count: quarantineCount, error: quarantineCountError },
    schemaCheck,
  ] = await Promise.all([
    listStagingImportJobs(20),
    getStagingCount(),
    getPreStagingCounts(),
    getQuarantineCount(),
    checkStagingPreStagingSchema(),
  ]);
  const {
    count: preStagingCount,
    error: preStagingCountError,
    preStagingTableName,
    otherTableName: otherPreStagingTable,
    otherCount: otherPreStagingCount,
  } = preStagingCounts;
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-4">Upload merchant DB</h1>
      <p className="text-slate-600 text-sm mb-4">
        Upload a purchased merchant list (CSV) to <strong>Pre-Staging</strong>. Then click{" "}
        <strong>Normalize & dedupe</strong> to format and move uniques to <strong>Staging</strong>;
        duplicates go to <strong>Quarantine</strong>. Counts are updated on the job row.
      </p>
      <UploadMerchantDbClient
        jobs={jobs}
        listError={listError}
        stagingCount={stagingCount}
        stagingCountError={stagingCountError}
        preStagingCount={preStagingCount}
        preStagingCountError={preStagingCountError}
        preStagingTableName={preStagingTableName}
        otherPreStagingTable={otherPreStagingTable}
        otherPreStagingCount={otherPreStagingCount}
        quarantineCount={quarantineCount}
        quarantineCountError={quarantineCountError}
        schemaCheck={schemaCheck}
      />
      <p className="mt-6">
        <Link href="/admin" className="text-[var(--brand-blue)] hover:underline">
          ← Dashboard
        </Link>
      </p>
    </div>
  );
}

/**
 * Check if merchant_applications, merchant_application_files tables and merchant-documents bucket exist.
 * Run: node scripts/check-supabase-setup.js
 */
require("./load-env-local");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const results = { merchant_applications: false, merchant_application_files: false, abandoned_application_progress: false, bucket: false };

  const { error: e1 } = await supabase.from("merchant_applications").select("id").limit(1);
  results.merchant_applications = !e1;
  if (e1) console.error("merchant_applications:", e1.message);

  const { error: e2 } = await supabase.from("merchant_application_files").select("id").limit(1);
  results.merchant_application_files = !e2;
  if (e2) console.error("merchant_application_files:", e2.message);

  const { error: e3 } = await supabase.from("abandoned_application_progress").select("id").limit(1);
  results.abandoned_application_progress = !e3;
  if (e3) console.error("abandoned_application_progress:", e3.message);

  const { data: buckets } = await supabase.storage.listBuckets();
  results.bucket = (buckets || []).some((b) => b.name === "merchant-documents");

  console.log("merchant_applications table:", results.merchant_applications ? "exists" : "missing");
  console.log("merchant_application_files table:", results.merchant_application_files ? "exists" : "missing");
  console.log("abandoned_application_progress table:", results.abandoned_application_progress ? "exists" : "missing");
  console.log("merchant-documents bucket:", results.bucket ? "exists" : "missing");

  const all = results.merchant_applications && results.merchant_application_files && results.bucket;
  process.exit(all ? 0 : 1);
}

main();

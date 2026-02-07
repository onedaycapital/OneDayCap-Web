/**
 * Fetch the most recent application from Supabase and generate a PDF
 * so you can preview it. Output: public/sample-application.pdf
 *
 * Prerequisites: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * Run: npx tsx scripts/generate-pdf-from-supabase.ts
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { generateApplicationPdf } from "../lib/application-pdf";
import type { SubmitPayload } from "../app/actions/submit-application";
import { computePaperClassification } from "../lib/paper-classifier";

// Load .env.local
const envPath = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        )
          val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

async function main() {
  const supabase = createClient(url as string, key as string, { auth: { persistSession: false } });

  const { data: row, error } = await supabase
    .from("merchant_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Supabase error:", error.message);
    process.exit(1);
  }
  if (!row) {
    console.error("No applications found in merchant_applications. Submit one from the app first.");
    process.exit(1);
  }

  const payload: SubmitPayload = {
    personal: {
      firstName: row.first_name ?? "",
      lastName: row.last_name ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      smsConsent: row.sms_consent ?? false,
    },
    business: {
      businessName: row.business_name ?? "",
      dba: row.dba ?? "",
      typeOfBusiness: row.type_of_business ?? "",
      startDateOfBusiness: row.start_date_of_business ?? "",
      ein: row.ein ?? "",
      address: row.address ?? "",
      city: row.city ?? "",
      state: row.state ?? "",
      zip: row.zip ?? "",
      industry: row.industry ?? "",
    },
    financial: {
      monthlyRevenue: row.monthly_revenue ?? "",
      fundingRequest: row.funding_request ?? "",
      useOfFunds: row.use_of_funds ?? "",
    },
    creditOwnership: {
      ssn: row.ssn ?? "",
      address: row.owner_address ?? "",
      city: row.owner_city ?? "",
      state: row.owner_state ?? "",
      zip: row.owner_zip ?? "",
      ownershipPercent: row.ownership_percent ?? "",
    },
    signature: {
      signatureDataUrl: row.signature_data_url ?? null,
      signedAt: row.signed_at ? new Date(row.signed_at).toISOString() : null,
      auditId: row.audit_id ?? null,
    },
  };

  const classification = row.industry_risk_tier != null && row.paper_type != null
    ? { industryRiskTier: row.industry_risk_tier as "Low" | "Medium" | "High" | "Very High", paperType: row.paper_type as "A" | "B" | "C" | "D" }
    : computePaperClassification(payload);
  console.log("Generating PDF for:", payload.business.businessName, "| Paper:", classification.paperType, "| Industry risk:", classification.industryRiskTier);
  const pdfBuffer = await generateApplicationPdf(payload, undefined, classification);

  const outPath = path.join(process.cwd(), "public", "sample-application.pdf");
  fs.writeFileSync(outPath, pdfBuffer);
  console.log("Wrote:", outPath);
  console.log("Open in browser: /sample-application.pdf (with dev server) or open the file directly.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

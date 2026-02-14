import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * Debug: see raw RPC response for pre_staging count.
 * Visit /api/debug-pre-staging-count (with dev server running) to see what Supabase returns.
 * Remove or restrict this route in production.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseServer();
  const tableName = process.env.SUPABASE_PRE_STAGING_TABLE?.trim() || "pre_staging";
  const { data, error } = await supabase.rpc("get_pre_staging_count", { table_name: tableName });
  return NextResponse.json({
    data,
    error: error?.message ?? null,
    dataType: typeof data,
    dataConstructor: data != null ? data.constructor?.name : null,
    isArray: Array.isArray(data),
    stringified: JSON.stringify(data),
  });
}

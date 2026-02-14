"use server";

import { getSupabaseServer } from "@/lib/supabase-server";

export interface AdminApplicationRow {
  id: string;
  businessName: string;
  email: string;
  state: string | null;
  submissionStatus: string | null;
  createdAt: string;
}

export async function listApplicationsForAdmin(options?: {
  limit?: number;
  status?: "pending_documents" | "submitted";
}): Promise<AdminApplicationRow[]> {
  const supabase = getSupabaseServer();
  let query = supabase
    .from("merchant_applications")
    .select("id, business_name, email, state, submission_status, created_at")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.status) {
    query = query.eq("submission_status", options.status);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data || []).map((row) => ({
    id: row.id,
    businessName: row.business_name ?? "",
    email: row.email ?? "",
    state: row.state ?? null,
    submissionStatus: row.submission_status ?? null,
    createdAt: row.created_at ?? "",
  }));
}

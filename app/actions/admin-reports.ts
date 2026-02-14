"use server";

import { getSupabaseServer } from "@/lib/supabase-server";

export interface ApplicationActivityReport {
  daily: {
    createdToday: number;
    submittedToday: number;
  };
  weekly: {
    createdLast7Days: number;
    submittedLast7Days: number;
  };
  totals: {
    totalSubmitted: number;
    totalPendingDocuments: number;
  };
}

function startOfDayUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}T00:00:00.000Z`;
}

function toISO(d: Date): string {
  return d.toISOString();
}

export async function getApplicationActivityReport(): Promise<ApplicationActivityReport> {
  const supabase = getSupabaseServer();
  const now = new Date();
  const todayStart = startOfDayUTC(now);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const weekStart = toISO(sevenDaysAgo);

  const [
    createdTodayRes,
    submittedTodayRes,
    createdLast7Res,
    submittedLast7Res,
    totalSubmittedRes,
    totalPendingRes,
  ] = await Promise.all([
    supabase
      .from("merchant_applications")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart)
      .lte("created_at", toISO(now)),
    supabase
      .from("merchant_applications")
      .select("id", { count: "exact", head: true })
      .eq("submission_status", "submitted")
      .gte("created_at", todayStart)
      .lte("created_at", toISO(now)),
    supabase
      .from("merchant_applications")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekStart)
      .lte("created_at", toISO(now)),
    supabase
      .from("merchant_applications")
      .select("id", { count: "exact", head: true })
      .eq("submission_status", "submitted")
      .gte("created_at", weekStart)
      .lte("created_at", toISO(now)),
    supabase
      .from("merchant_applications")
      .select("id", { count: "exact", head: true })
      .eq("submission_status", "submitted"),
    supabase
      .from("merchant_applications")
      .select("id", { count: "exact", head: true })
      .eq("submission_status", "pending_documents"),
  ]);

  return {
    daily: {
      createdToday: createdTodayRes.count ?? 0,
      submittedToday: submittedTodayRes.count ?? 0,
    },
    weekly: {
      createdLast7Days: createdLast7Res.count ?? 0,
      submittedLast7Days: submittedLast7Res.count ?? 0,
    },
    totals: {
      totalSubmitted: totalSubmittedRes.count ?? 0,
      totalPendingDocuments: totalPendingRes.count ?? 0,
    },
  };
}

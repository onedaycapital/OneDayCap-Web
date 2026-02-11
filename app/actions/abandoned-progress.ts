"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import type { AbandonedPayload } from "@/lib/abandoned-payload";

const TABLE = "abandoned_application_progress";

export type { AbandonedPayload } from "@/lib/abandoned-payload";

export type GetAbandonedResult =
  | { found: true; lastStep: number; payload: AbandonedPayload; updatedAt: string }
  | { found: false };

/** Get abandoned progress by email. Check this first when user enters email on Step 1. */
export async function getAbandonedProgress(email: string): Promise<GetAbandonedResult> {
  const trimmed = email?.trim().toLowerCase();
  if (!trimmed) return { found: false };
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from(TABLE)
      .select("last_step, payload, updated_at")
      .eq("email", trimmed)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("getAbandonedProgress error:", error);
      return { found: false };
    }
    if (data && typeof data.payload === "object" && typeof data.last_step === "number") {
      const updatedAt = typeof (data as { updated_at?: string }).updated_at === "string"
        ? (data as { updated_at: string }).updated_at
        : new Date().toISOString();
      console.log("[Abandoned] found progress for:", trimmed, "-> restoring, Staging lookup skipped");
      return {
        found: true,
        lastStep: data.last_step as number,
        payload: data.payload as AbandonedPayload,
        updatedAt,
      };
    }
    return { found: false };
  } catch (e) {
    console.error("getAbandonedProgress:", e);
    return { found: false };
  }
}

/** Upsert progress by email. Call on step transition and/or debounced on field change. */
export async function upsertAbandonedProgress(
  email: string,
  lastStep: number,
  payload: AbandonedPayload
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = email?.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "Email required" };
  if (lastStep < 1 || lastStep > 5) return { ok: false, error: "Invalid step" };
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from(TABLE).upsert(
      {
        email: trimmed,
        last_step: lastStep,
        payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );
    if (error) {
      console.error("upsertAbandonedProgress error:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("upsertAbandonedProgress:", e);
    return { ok: false, error: msg };
  }
}

/** Remove abandoned progress for this email after successful submit. */
export async function clearAbandonedProgress(email: string): Promise<void> {
  const trimmed = email?.trim().toLowerCase();
  if (!trimmed) return;
  try {
    const supabase = getSupabaseServer();
    await supabase.from(TABLE).delete().eq("email", trimmed);
  } catch (e) {
    console.error("clearAbandonedProgress:", e);
  }
}

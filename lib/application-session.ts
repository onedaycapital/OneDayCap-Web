/**
 * Application sessions: source of truth for abandonment nudges, resume links, 15-day follow-up.
 * Amplitude is used for analytics only; this drives email triggers.
 */

import { getSupabaseServer } from "@/lib/supabase-server";
import { log, LOG_SCOPE } from "@/lib/log";

const TABLE = "application_sessions";

export type SessionEvent = "step_view" | "step_complete" | "submit";

export interface SessionEventPayload {
  email?: string;
  event: SessionEvent;
  step: number;
  application_id?: string;
}

export interface ApplicationSessionRow {
  id: string;
  email: string;
  token: string;
  current_step: number;
  last_event: string | null;
  last_event_at: string | null;
  started_at: string;
  submitted_at: string | null;
  nudge_30m_sent_at: string | null;
  nudge_24h_sent_at: string | null;
  last_15d_followup_sent_at: string | null;
  opted_out: boolean;
}

function generateToken(): string {
  return crypto.randomUUID();
}

function normalizeEmail(email: string): string {
  return email?.trim().toLowerCase() || "";
}

/** Upsert session by email: create with token if new, update current_step and last_event. */
export async function upsertSessionEvent(payload: SessionEventPayload): Promise<{ ok: boolean; token?: string; error?: string }> {
  const email = normalizeEmail(payload.email ?? "");
  if (!email) return { ok: false, error: "Email required for session" };
  if (payload.step < 1 || payload.step > 5) return { ok: false, error: "Invalid step" };

  try {
    const supabase = getSupabaseServer();
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from(TABLE)
      .select("id, token, current_step")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const currentStep = Math.max((existing.current_step as number) ?? 1, payload.step);
      const updates: Record<string, unknown> = {
        current_step: currentStep,
        last_event: payload.event,
        last_event_at: now,
        updated_at: now,
      };
      if (payload.event === "submit") {
        updates.submitted_at = now;
      }
      const { error } = await supabase.from(TABLE).update(updates).eq("email", email);
      if (error) {
        log.error(LOG_SCOPE.APP_SESSION, "Update error", error, { event: payload.event, step: payload.step });
        return { ok: false, error: error.message };
      }
      return { ok: true, token: existing.token as string };
    }

    const token = generateToken();
    const { error } = await supabase.from(TABLE).insert({
      email,
      token,
      current_step: payload.step,
      last_event: payload.event,
      last_event_at: now,
      started_at: now,
      submitted_at: payload.event === "submit" ? now : null,
      updated_at: now,
    });
    if (error) {
      log.error(LOG_SCOPE.APP_SESSION, "Insert error", error, { event: payload.event, step: payload.step });
      return { ok: false, error: error.message };
    }
    return { ok: true, token };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error(LOG_SCOPE.APP_SESSION, "upsertSessionEvent failed", e, { event: payload.event, step: payload.step });
    return { ok: false, error: msg };
  }
}

/** Get session by resume token. Returns null if not found or opted out. */
export async function getSessionByToken(token: string): Promise<{
  email: string;
  current_step: number;
  token: string;
} | null> {
  const t = token?.trim();
  if (!t) return null;
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from(TABLE)
      .select("email, current_step, token, opted_out")
      .eq("token", t)
      .limit(1)
      .maybeSingle();
    if (error || !data || (data as { opted_out?: boolean }).opted_out) return null;
    return {
      email: (data as { email: string }).email,
      current_step: (data as { current_step: number }).current_step,
      token: (data as { token: string }).token,
    };
  } catch {
    return null;
  }
}

/** Set opted_out = true for session with this token. */
export async function optOutByToken(token: string): Promise<boolean> {
  const t = token?.trim();
  if (!t) return false;
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from(TABLE).update({ opted_out: true, updated_at: new Date().toISOString() }).eq("token", t);
    return !error;
  } catch {
    return false;
  }
}

/** Mark session as submitted by email (e.g. from submit-application). */
export async function markSubmitted(email: string): Promise<void> {
  const e = normalizeEmail(email);
  if (!e) return;
  try {
    const supabase = getSupabaseServer();
    await supabase.from(TABLE).update({ submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("email", e);
  } catch (err) {
    log.error(LOG_SCOPE.APP_SESSION, "markSubmitted failed", err);
  }
}

/** For 30-min nudge: not submitted, no 30m sent yet, last_event_at >= 30 min ago. */
export async function getSessionsFor30mNudge(): Promise<ApplicationSessionRow[]> {
  const supabase = getSupabaseServer();
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .is("submitted_at", null)
    .eq("opted_out", false)
    .is("nudge_30m_sent_at", null)
    .not("last_event_at", "is", null)
    .lte("last_event_at", cutoff);
  if (error) {
    log.error(LOG_SCOPE.APP_SESSION, "getSessionsFor30mNudge failed", error);
    return [];
  }
  return (data ?? []) as ApplicationSessionRow[];
}

/** For 24h nudge: not submitted, 30m sent, 24h not sent, started_at >= 24h ago. */
export async function getSessionsFor24hNudge(): Promise<ApplicationSessionRow[]> {
  const supabase = getSupabaseServer();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .is("submitted_at", null)
    .eq("opted_out", false)
    .not("nudge_30m_sent_at", "is", null)
    .is("nudge_24h_sent_at", null)
    .lte("started_at", cutoff);
  if (error) {
    log.error(LOG_SCOPE.APP_SESSION, "getSessionsFor24hNudge failed", error);
    return [];
  }
  return (data ?? []) as ApplicationSessionRow[];
}

/** For 15-day follow-up: not submitted, opted_in, last_15d either null or >= 15 days ago. */
export async function getSessionsFor15dFollowup(): Promise<ApplicationSessionRow[]> {
  const supabase = getSupabaseServer();
  const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .is("submitted_at", null)
    .eq("opted_out", false)
    .or("last_15d_followup_sent_at.is.null,last_15d_followup_sent_at.lte." + cutoff);
  if (error) {
    log.error(LOG_SCOPE.APP_SESSION, "getSessionsFor15dFollowup failed", error);
    return [];
  }
  return (data ?? []) as ApplicationSessionRow[];
}

/** Funnel digest: emails that have visited (have session) but not submitted. */
export async function getFunnelIncompleteEmails(): Promise<{ email: string; current_step: number; last_event_at: string | null }[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from(TABLE)
    .select("email, current_step, last_event_at")
    .is("submitted_at", null)
    .order("last_event_at", { ascending: false });
  if (error) {
    log.error(LOG_SCOPE.APP_SESSION, "getFunnelIncompleteEmails failed", error);
    return [];
  }
  return (data ?? []) as { email: string; current_step: number; last_event_at: string | null }[];
}

/** Re-check that session is still eligible before sending (avoid race with submit). */
export async function isStillEligibleForNudge(sessionId: string): Promise<boolean> {
  const supabase = getSupabaseServer();
  const { data } = await supabase.from(TABLE).select("submitted_at, opted_out").eq("id", sessionId).limit(1).maybeSingle();
  if (!data) return false;
  const row = data as { submitted_at: string | null; opted_out: boolean };
  return row.submitted_at == null && !row.opted_out;
}

/** Set nudge_30m_sent_at for session. */
export async function setNudge30mSent(sessionId: string): Promise<void> {
  const supabase = getSupabaseServer();
  await supabase.from(TABLE).update({ nudge_30m_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", sessionId);
}

/** Set nudge_24h_sent_at for session. */
export async function setNudge24hSent(sessionId: string): Promise<void> {
  const supabase = getSupabaseServer();
  await supabase.from(TABLE).update({ nudge_24h_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", sessionId);
}

/** Set last_15d_followup_sent_at for session. */
export async function set15dFollowupSent(sessionId: string): Promise<void> {
  const supabase = getSupabaseServer();
  await supabase.from(TABLE).update({ last_15d_followup_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", sessionId);
}

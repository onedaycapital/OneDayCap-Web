/**
 * Client-side calls to POST /api/app/session-event for abandonment nudge and funnel tracking.
 * Call from ApplicationForm at step view, step complete, and submit (when email is present).
 */

export type SessionEventType = "apply_landing" | "step_view" | "step_complete" | "submit";

export async function sendSessionEvent(params: {
  email: string;
  event: SessionEventType;
  step: number;
  application_id?: string;
}): Promise<void> {
  const email = params.email?.trim();
  if (!email) return;
  try {
    await fetch("/api/app/session-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        event: params.event,
        step: params.step,
        application_id: params.application_id,
      }),
    });
  } catch {
    // fire-and-forget; do not block UI
  }
}

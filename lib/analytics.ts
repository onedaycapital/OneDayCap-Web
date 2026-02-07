/**
 * Amplitude analytics for the application form and campaign attribution.
 * Uses window.amplitude (loaded via script in layout). All calls are no-ops if Amplitude isn't loaded.
 */

const AMPLITUDE =
  typeof window !== "undefined"
    ? (window as unknown as {
        amplitude?: {
          setUserId: (id: string) => void;
          track: (name: string, props?: Record<string, unknown>) => void;
          Identify?: new () => { set: (key: string, value: unknown) => unknown };
          identify?: (identify: unknown) => void;
        };
      }).amplitude
    : undefined;

/** SessionStorage key for campaign rid (from ?rid= in URL). */
export const CAMPAIGN_RID_KEY = "campaign_rid";

/** SessionStorage key for campaign email (from rid when rid is email, or ?email=/?e= when rid present). Used to prefill apply form. */
export const CAMPAIGN_EMAIL_KEY = "campaign_email";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getCampaignRid(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(CAMPAIGN_RID_KEY);
  } catch {
    return null;
  }
}

/**
 * Returns the campaign email if the user landed via a campaign URL that included an email param.
 * Used to prefill the application form email field for cold-email campaign users.
 */
export function getCampaignEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const email = sessionStorage.getItem(CAMPAIGN_EMAIL_KEY)?.trim();
    return email && EMAIL_REGEX.test(email) ? email : null;
  } catch {
    return null;
  }
}

/**
 * Call on first page load when URL has ?rid=.
 * Stores rid, sets Amplitude user id to rid, and tracks Campaign Link Visited.
 * For apply-form prefill: if rid is a valid email we use it; else if ?email= or ?e= is present we use that.
 * So campaign URL can be a single param: ?rid={{email}} (no duplication).
 */
export function captureCampaignRidFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const rid = params.get("rid")?.trim();
  if (!rid) return false;
  try {
    sessionStorage.setItem(CAMPAIGN_RID_KEY, rid);
    const explicitEmail = params.get("email")?.trim() || params.get("e")?.trim();
    const prefillEmail = explicitEmail && EMAIL_REGEX.test(explicitEmail)
      ? explicitEmail
      : EMAIL_REGEX.test(rid)
        ? rid
        : null;
    if (prefillEmail) sessionStorage.setItem(CAMPAIGN_EMAIL_KEY, prefillEmail);
    AMPLITUDE?.setUserId(rid);
    AMPLITUDE?.track("Campaign Link Visited", { rid, source: "campaign", referrer: document.referrer || undefined });
    return true;
  } catch {
    return false;
  }
}

export function setAnalyticsUserId(userId: string): void {
  const id = userId?.trim();
  if (!id) return;
  try {
    AMPLITUDE?.setUserId(id);
  } catch {
    // ignore
  }
}

/**
 * Track an application form event. If properties.step_name is set, the event name
 * sent to Amplitude includes it (e.g. "Application Step Viewed - Email") so the
 * feed shows which step the user is on.
 */
export function trackApplicationForm(event: string, properties?: Record<string, unknown>): void {
  try {
    const rid = getCampaignRid();
    const props: Record<string, unknown> = { ...properties, source: "application_form" };
    if (rid) props.campaign_rid = rid;
    const stepName = typeof props.step_name === "string" ? props.step_name.trim() : "";
    const eventName = stepName ? `${event} - ${stepName}` : event;
    AMPLITUDE?.track(eventName, props);
  } catch {
    // ignore
  }
}

// Predefined events for funnel analysis
export const ApplicationFormEvents = {
  FormStarted: "Application Form Started",
  StepViewed: "Application Step Viewed",
  StepCompleted: "Application Step Completed",
  StepValidationFailed: "Application Step Validation Failed",
  FormSubmitted: "Application Form Submitted",
  FormSubmitFailed: "Application Form Submit Failed",
  SessionEnded: "Application Session Ended",
  RestoredFromAbandoned: "Application Restored From Abandoned",
} as const;

/**
 * Runtime logging for Vercel/build analysis.
 * Use a consistent [scope] prefix so logs can be filtered (e.g. "cron:abandonment-nudges", "api:session-event").
 * Logs to console; in Vercel these appear in Functions and Build logs.
 */

type LogMeta = Record<string, string | number | boolean | null | undefined>;

function formatMessage(scope: string, message: string, meta?: LogMeta): string {
  const parts = [`[${scope}]`, message];
  if (meta && Object.keys(meta).length > 0) {
    parts.push(JSON.stringify(meta));
  }
  return parts.join(" ");
}

export const log = {
  /** Info: normal operation (e.g. cron started, counts). */
  info(scope: string, message: string, meta?: LogMeta): void {
    console.log(formatMessage(scope, message, meta));
  },

  /** Warn: recoverable or unexpected but handled (e.g. no candidates, send skipped). */
  warn(scope: string, message: string, meta?: LogMeta): void {
    console.warn(formatMessage(scope, message, meta));
  },

  /** Error: failure (e.g. DB error, send failed). Include error message for analysis. */
  error(scope: string, message: string, err?: unknown, meta?: LogMeta): void {
    const errMsg = err instanceof Error ? err.message : err != null ? String(err) : undefined;
    const fullMeta = { ...meta, ...(errMsg ? { error: errMsg } : {}) };
    console.error(formatMessage(scope, message, fullMeta));
    if (err instanceof Error && err.stack) {
      console.error(`[${scope}] stack:`, err.stack);
    }
  },
};

/** Scopes used across the app (search for these in Vercel logs). */
export const LOG_SCOPE = {
  CRON_ABANDONMENT: "cron:abandonment-nudges",
  CRON_PENDING_DOCUMENTS: "cron:pending-documents-reminder",
  CRON_FOLLOWUP_15D: "cron:followup-15d",
  CRON_FUNNEL_NOON: "cron:funnel-digest-noon",
  CRON_FUNNEL_3PM: "cron:funnel-digest-3pm",
  API_SESSION_EVENT: "api:session-event",
  API_RESUME: "api:resume",
  APP_SESSION: "app:application-session",
  EMAIL: "email:send",
  STAGING_MAP: "staging:contact-map",
  UNSUBSCRIBE: "unsubscribe",
} as const;

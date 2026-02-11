import { optOutByToken } from "@/lib/application-session";
import { log, LOG_SCOPE } from "@/lib/log";
import Link from "next/link";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: { t?: string };
}) {
  const token = searchParams.t?.trim();
  let done = false;
  if (token) {
    done = await optOutByToken(token);
    if (done) log.info(LOG_SCOPE.UNSUBSCRIBE, "Opt-out completed", { token_length: token.length });
    else log.warn(LOG_SCOPE.UNSUBSCRIBE, "Invalid or already used token", { token_length: token.length });
  } else {
    log.warn(LOG_SCOPE.UNSUBSCRIBE, "No token provided");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Unsubscribe</h1>
        {done ? (
          <p className="mt-2 text-slate-600">
            You&apos;ve been unsubscribed. You won&apos;t receive further application reminder emails from us.
          </p>
        ) : token ? (
          <p className="mt-2 text-slate-600">This link is invalid or has already been used.</p>
        ) : (
          <p className="mt-2 text-slate-600">No unsubscribe token was provided.</p>
        )}
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-[var(--brand-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

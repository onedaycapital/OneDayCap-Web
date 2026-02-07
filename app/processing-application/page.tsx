import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProcessingFlowChart } from "@/components/ProcessingFlowChart";
import { ProcessingApplicationSummary } from "@/components/ProcessingApplicationSummary";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Processing Your Application | OneDay Capital",
  description:
    "Your funding application is being processed. Track the progress of your application through our network of funders.",
};

export default function ProcessingApplicationPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 md:pt-28 pb-20 px-4 sm:px-6 bg-[var(--background)]">
        {/* Three tiles above the hero: Status, PDF (if available), Additional Details (if available) */}
        <section className="max-w-6xl mx-auto mt-4 sm:mt-6 mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Tile 1: Processing Your Application (always shown) */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[var(--brand-blue)]/40 transition-colors">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</h2>
              <p className="mt-1 font-heading text-base sm:text-lg font-bold text-[var(--brand-black)]">
                Processing Your Application
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                We&apos;re working with our funder network to find the best options for you.
              </p>
            </div>

            {/* Tiles 2 & 3: Loan Application PDF File + Additional Details (shown after submit; fragment children become grid cells) */}
            <ProcessingApplicationSummary />
          </div>
        </section>

        {/* Hero: Workflow (flow chart) */}
        <section className="max-w-6xl mx-auto mt-8 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-soft">
          <h2 className="font-heading text-lg sm:text-xl font-bold text-[var(--brand-black)] mb-6">
            Your application progress
          </h2>
          <ProcessingFlowChart />
        </section>

        {/* Next Steps */}
        <section className="max-w-3xl mx-auto mt-16">
          <div className="rounded-2xl border-2 border-slate-200/80 bg-white p-6 sm:p-8 shadow-soft">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-[var(--brand-black)] mb-6">
              Next Steps
            </h2>
            <ol className="list-decimal pl-5 space-y-5 text-slate-700 text-sm sm:text-base leading-relaxed">
              <li>
                <strong className="text-[var(--brand-black)]">Prepare your documents.</strong> Having these ready will speed up funding:
                <ul className="mt-2 ml-4 list-disc space-y-1.5 text-slate-600">
                  <li>Void check</li>
                  <li>Mid-month bank statement (PDF from your bank for this month)</li>
                  <li>AR Report 60–90 days (some funders may request this)</li>
                  <li>Proof of business ownership (registration, license, etc.)</li>
                  <li>Previous loan closure letter (zero balance letter)</li>
                  <li>New loan contracts (if you took funding in the last 30 days)</li>
                </ul>
              </li>
              <li>
                <strong className="text-[var(--brand-black)]">Review your funding offer.</strong> It will detail the amount, term, repayment schedule, interest rate, and related terms.
              </li>
              <li>
                <strong className="text-[var(--brand-black)]">Sign loan documents.</strong> If you accept the offer, the funder will send documents via DocuSign.
              </li>
              <li>
                <strong className="text-[var(--brand-black)]">Complete bank verification.</strong> After signing, you&apos;ll receive a call for bank verification. Funders may need temporary access to verify that bank statements match your transactions and to prevent fraud.
              </li>
              <li>
                <strong className="text-[var(--brand-black)]">Receive your funds.</strong> Once verification is complete, funds will be wired to your bank account.
              </li>
            </ol>
            <p className="mt-6 text-slate-600 text-sm sm:text-base leading-relaxed">
              The full process typically takes 1–4 hours, depending on the time of day and how quickly documents are provided.
            </p>
            <p className="mt-4 text-slate-700 text-sm sm:text-base leading-relaxed">
              We wish you the best and look forward to completing your funding soon. For documents or questions, email us at{" "}
              <a href="mailto:subs@onedaycap.com" className="text-[var(--brand-blue)] font-medium hover:underline">
                subs@onedaycap.com
              </a>
              {" "}and include your business name in the subject line. Our agents are here to help.
            </p>
          </div>
        </section>

        {/* Footer link */}
        <div className="mt-16 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[var(--brand-blue)] font-medium hover:underline"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

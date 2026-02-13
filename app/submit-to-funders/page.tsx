import type { Metadata } from "next";
import { Header } from "@/components/Header";
import Link from "next/link";
import { SubmitToFundersForm } from "./SubmitToFundersForm";

export const metadata: Metadata = {
  title: "Submit to funders | OneDay Capital",
  description: "Shortlist funders and email them a merchant application.",
};

export default function SubmitToFundersPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 md:pt-28 pb-20 px-4 sm:px-6 bg-[var(--background)]">
        <section className="max-w-2xl mx-auto mt-6">
          <div className="mb-4">
            <Link href="/" className="text-sm text-[var(--brand-blue)] hover:underline">
              ← Home
            </Link>
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-[var(--brand-black)] mb-2">
            Submit application to funders
          </h1>
          <p className="text-slate-600 text-sm mb-6">
            Choose an application and one or more funders. We’ll email the full application package to each funder: application form PDF, bank statements, void check, and driver’s license (as submitted by the applicant). Recipients use each funder’s submission rules (or contact email).
          </p>
          <SubmitToFundersForm />
        </section>
      </main>
    </>
  );
}

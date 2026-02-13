"use client";

import { CTAButton } from "./CTAButton";

const CHECK_ITEMS = [
  "100% Online",
  "Instant Pre-Approval Quote",
  "Real-Time Funding Decisions",
];

const TRUST_ITEMS = [
  { icon: "🔒", label: "Secure Application" },
  { icon: "⚡", label: "Fully Automated Platform" },
  { icon: "🇺🇸", label: "Serving U.S. Small Businesses" },
];

export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex flex-col items-center justify-center px-4 pt-44 pb-14 sm:px-8 sm:pt-52 sm:pb-16 md:px-10 lg:px-12 overflow-hidden bg-slate-900"
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-5xl mx-auto text-left space-y-5 sm:space-y-6 md:space-y-7">
        <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-[2.75rem] font-bold text-white tracking-tight leading-tight">
          When Your Business Needs Capital, You Need It Fast.
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-slate-200 leading-relaxed max-w-2xl">
          See your pre-approval in minutes.
          <br />
          Funding available the same day.
        </p>

        <ul className="flex flex-col gap-2 sm:gap-2.5 text-slate-200 text-base sm:text-lg" aria-label="Key benefits">
          {CHECK_ITEMS.map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <span className="text-emerald-400 font-bold shrink-0" aria-hidden>✔</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-2 pt-1 sm:pt-2">
          <CTAButton href="/apply" variant="primary" size="lg" showArrowOnHover>
            See If You Qualify
          </CTAButton>
          <p className="text-slate-400 text-sm italic max-w-md">
            No impact to your credit to check eligibility.
          </p>
        </div>

        <hr className="border-slate-600 my-6 sm:my-8" aria-hidden />

        <ul className="flex flex-wrap gap-x-6 gap-y-3 sm:gap-y-2 text-slate-300 text-sm sm:text-base" aria-label="Trust indicators">
          {TRUST_ITEMS.map(({ icon, label }) => (
            <li key={label} className="flex items-center gap-2">
              <span aria-hidden className="shrink-0">{icon}</span>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

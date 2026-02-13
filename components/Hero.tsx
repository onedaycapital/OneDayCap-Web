"use client";

import Link from "next/link";
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
      className="relative flex flex-col items-center justify-center px-4 pt-44 pb-14 sm:px-8 sm:pt-52 sm:pb-16 md:px-10 lg:px-12 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #0c1222 100%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-5xl mx-auto text-center flex flex-col items-center space-y-6 sm:space-y-7 md:space-y-8">
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.1]">
          <span
            className="block sm:whitespace-nowrap bg-gradient-to-r from-[var(--brand-blue)] via-[var(--brand-cyan)] to-indigo-400 bg-clip-text text-transparent"
          >
            When Your Business Needs Capital,
          </span>
          <span className="mt-3 sm:mt-4 block text-white">
            You Need It Fast.
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-slate-200 leading-relaxed max-w-2xl">
          See your pre-approval in minutes.
          <br />
          Funding available the same day.
        </p>

        <ul
          className="flex flex-wrap justify-center gap-x-6 gap-y-3 sm:gap-x-8 sm:gap-y-2 text-slate-200 text-base sm:text-lg"
          aria-label="Key benefits"
        >
          {CHECK_ITEMS.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold"
                aria-hidden
              >
                ✔
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-2 pt-1 sm:pt-2 flex flex-col items-center">
          <CTAButton href="/apply" variant="primary" size="lg" showArrowOnHover>
            See How Much You Qualify For
          </CTAButton>
          <p className="text-slate-400 text-sm italic max-w-md">
            No impact to your credit to check eligibility.
          </p>
          <Link
            href="/#rewards"
            className="text-slate-300 hover:text-white text-sm font-medium transition-colors underline underline-offset-2 decoration-slate-500 hover:decoration-white"
          >
            Guaranteed free gift - up to $5,000 when we fund. See details →
          </Link>
        </div>

        <hr className="border-slate-600 my-4 sm:my-6 w-full max-w-xs" aria-hidden />

        <ul
          className="flex flex-wrap justify-center gap-x-6 gap-y-3 sm:gap-x-8 text-slate-300 text-sm sm:text-base"
          aria-label="Trust indicators"
        >
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

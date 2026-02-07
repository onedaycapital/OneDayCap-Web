"use client";

import Image from "next/image";
import Link from "next/link";
import { CTAButton } from "./CTAButton";

const TYPE_LINE =
  "Decisions as fast as the same day. Funding available within 24 hours.";

export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex flex-col items-center justify-center px-6 pt-52 pb-10 overflow-hidden bg-slate-900"
    >
      {/* Section 1: Blue + dots */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />

      <div className="relative max-w-3xl mx-auto text-center space-y-8">
        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.1]">
          Capital.{" "}
          <span className="text-white/90">In One Day.</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-200 leading-relaxed max-w-2xl mx-auto font-medium">
          Fast, flexible access to working capital for small businesses — no
          collateral, minimal paperwork, and same-day decisions.
        </p>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
          We help business owners secure funding based on real cash flow, not
          personal credit scores.
        </p>
        <p className="text-lg sm:text-xl text-slate-200 font-bold leading-relaxed max-w-2xl mx-auto">
          {TYPE_LINE}
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <CTAButton href="/application" variant="primary" size="lg" showArrowOnHover>
            Apply Now
          </CTAButton>
          <span className="text-slate-400 max-sm:hidden" aria-hidden>·</span>
          <Link
            href="#rewards"
            className="text-slate-300 hover:text-white font-medium text-base sm:text-lg transition-colors duration-200 underline underline-offset-2 decoration-slate-400 hover:decoration-white"
          >
            See our promotional offer
          </Link>
        </div>
        <div className="pt-6 flex justify-center">
          <Image
            src="/images/bull-hero.png"
            alt=""
            width={140}
            height={95}
            className="object-contain opacity-95"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}

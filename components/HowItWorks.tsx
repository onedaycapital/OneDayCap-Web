"use client";

import { CTAButton } from "./CTAButton";

const STEPS = [
  {
    title: "Apply Online",
    body: "Complete a short application in minutes. No collateral required.",
  },
  {
    title: "Cash-Flow Review",
    body: "Your business is evaluated based on actual performance — not your personal credit score.",
  },
  {
    title: "Capital Arranged",
    body: "Receive a fast decision. In many cases, funds are delivered within one business day.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative py-24 px-6 bg-slate-900 overflow-hidden"
    >
      {/* Section 3: Blue + dots */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />
      <div className="relative max-w-4xl mx-auto">
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white text-center mb-4 tracking-tight">
          A Simple, Efficient Process
        </h2>
        <p className="text-center text-slate-300 mb-16 font-medium">
          How it works
        </p>

        {/* Desktop: horizontal tiles in a row (lg+ only; tablet uses timeline) */}
        <div className="relative hidden lg:grid lg:grid-cols-3 gap-6 xl:gap-8">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="rounded-2xl border border-white/20 bg-white/5 p-6 lg:p-8 shadow-soft hover:border-white/30 hover:bg-white/10 transition-all duration-300 flex flex-col"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-lg font-bold text-white mb-4">
                {i + 1}
              </div>
              <h3 className="font-heading text-xl font-semibold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-slate-300 leading-relaxed text-sm lg:text-base flex-1">
                {step.body}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile + Tablet: vertical timeline-style cards with connector */}
        <div className="lg:hidden relative pl-8 space-y-0">
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-white/20 rounded-full" aria-hidden />
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="relative flex gap-4 pb-8 last:pb-0"
            >
              <div className="absolute left-0 top-0 -translate-x-[1.625rem] flex-shrink-0 w-8 h-8 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-sm font-bold text-white z-10">
                {i + 1}
              </div>
              <div className="rounded-xl border border-white/20 bg-white/5 p-4 shadow-soft flex-1 min-w-0">
                <h3 className="font-heading font-semibold text-white mb-1.5">
                  {step.title}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <CTAButton href="https://submit.jotform.com/260232877555059" variant="primary" size="lg" showArrowOnHover openInNewTab>
            Apply Now
          </CTAButton>
        </div>
      </div>
    </section>
  );
}

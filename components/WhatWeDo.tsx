"use client";

export function WhatWeDo() {
  return (
    <section
      id="what-we-do"
      className="relative py-24 px-6 bg-white overflow-hidden"
    >
      {/* Section 2: White + diagonal lines */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 18px, rgba(29,91,184,0.06) 18px, rgba(29,91,184,0.06) 20px)",
          backgroundSize: "auto",
        }}
        aria-hidden
      />
      <div className="relative max-w-3xl mx-auto text-center space-y-6">
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--brand-black)] tracking-tight">
          Working Capital, Delivered Fast
        </h2>
        <p className="text-lg text-slate-600 leading-relaxed">
          OneDay Capital specializes in fast, short-term working capital for
          businesses that need liquidity now - not weeks from now.
        </p>
        <p className="text-slate-600 leading-relaxed">
          We assess real cash flow, act quickly, and structure funding that
          helps businesses stay operational, manage obligations, and move
          forward with confidence.
        </p>
      </div>
    </section>
  );
}

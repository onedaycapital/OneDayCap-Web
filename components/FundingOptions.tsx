"use client";

import { CTAButton } from "./CTAButton";

const OPTIONS = [
  {
    title: "Bad Credit Business Funding",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    title: "Equipment Financing",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    title: "Merchant Cash Advance",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    title: "SBA Business Funding",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <line x1="9" y1="22" x2="9" y2="12" />
        <line x1="15" y1="22" x2="15" y2="12" />
      </svg>
    ),
  },
  {
    title: "Business Line of Credit",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <line x1="6" y1="15" x2="6.01" y2="15" />
        <line x1="10" y1="15" x2="10.01" y2="15" />
        <line x1="14" y1="15" x2="14.01" y2="15" />
      </svg>
    ),
  },
  {
    title: "Business Term Funding",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <path d="M10 9h4" />
      </svg>
    ),
  },
  {
    title: "Revenue Based Business Funding",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
    ),
  },
  {
    title: "Working Capital Funding",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-4" />
        <path d="M9 9v.01" />
        <path d="M9 12v.01" />
        <path d="M9 15v.01" />
        <path d="M9 18v.01" />
      </svg>
    ),
  },
];

export function FundingOptions() {
  return (
    <section
      id="funding-options"
      className="relative py-24 px-6 bg-slate-900 overflow-hidden"
    >
      {/* Section 5: Blue + dots */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />

      <div className="relative max-w-5xl mx-auto text-center">
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
          Discover a variety of funding options available for your business.
        </h2>
        <div className="w-20 h-1 rounded-full bg-emerald-400 mx-auto mb-14" aria-hidden />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-14">
          {OPTIONS.map((option) => (
            <div
              key={option.title}
              className="bg-white/95 backdrop-blur rounded-2xl border border-white/20 p-6 shadow-soft hover:shadow-lg hover:border-emerald-400/30 transition-all duration-300 ease-out flex flex-col items-center justify-center min-h-[140px] text-center"
            >
              <span className="text-emerald-600 mb-3 flex items-center justify-center" aria-hidden>
                {option.icon}
              </span>
              <span className="text-slate-800 font-semibold text-sm leading-tight">
                {option.title}
              </span>
            </div>
          ))}
        </div>

        <CTAButton
          href="/application"
          variant="primary"
          size="lg"
          showArrowOnHover
          className="!bg-emerald-500 hover:!bg-emerald-600 !shadow-emerald-500/30 hover:!shadow-emerald-500/40"
        >
          Apply Now
        </CTAButton>
      </div>
    </section>
  );
}

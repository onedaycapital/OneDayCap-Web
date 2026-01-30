"use client";

const BULLETS = [
  "Same-day funding decisions",
  "No collateral required",
  "Minimal documentation",
  "Credit score is not the deciding factor",
  "Multiple funding options available",
  "Funds usable for any business purpose",
];

export function WhyChoose() {
  return (
    <section
      id="why-choose"
      className="relative py-24 px-6 bg-white overflow-hidden"
    >
      {/* Section 6: White + diagonal lines */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 18px, rgba(29,91,184,0.06) 18px, rgba(29,91,184,0.06) 20px)",
        }}
        aria-hidden
      />
      <div className="relative max-w-3xl mx-auto">
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--brand-black)] text-center mb-14 tracking-tight">
          Why Businesses Choose OneDay Capital
        </h2>
        <ul className="space-y-5">
          {BULLETS.map((text) => (
            <li
              key={text}
              className="flex items-center gap-4 text-slate-700 text-lg opacity-100"
            >
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-blue)]/15 to-[var(--brand-cyan)]/15 flex items-center justify-center border border-[var(--brand-blue)]/20">
                <span className="text-[var(--brand-blue)] text-sm font-bold">✓</span>
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

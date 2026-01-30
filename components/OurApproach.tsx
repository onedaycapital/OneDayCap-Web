export function OurApproach() {
  return (
    <section id="our-approach" className="relative py-24 px-6 bg-white overflow-hidden">
      {/* Section 8: White + diagonal lines */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 18px, rgba(29,91,184,0.06) 18px, rgba(29,91,184,0.06) 20px)",
        }}
        aria-hidden
      />
      <div className="relative max-w-3xl mx-auto text-center space-y-6">
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--brand-black)] tracking-tight">
          Not a Lender. A Capital Partner.
        </h2>
        <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
          We don&apos;t push one product. We match your business with funding
          options that make sense — fast, transparent, and aligned with your
          cash flow.
        </p>
      </div>
    </section>
  );
}

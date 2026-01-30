const USES = [
  "Payroll and wages",
  "Inventory and supplies",
  "Business expansion",
  "Equipment and repairs",
  "Marketing and growth initiatives",
  "Consolidating existing advances",
  "Managing short-term cash flow needs",
];

export function UseYourCapital() {
  return (
    <section id="use-capital" className="relative py-24 px-6 bg-slate-900 overflow-hidden">
      {/* Section 7: Blue + dots */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />
      <div className="relative max-w-3xl mx-auto text-center">
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          Use Your Capital Your Way
        </h2>
        <p className="text-slate-300 mb-12 text-lg">
          Working capital from OneDay Capital can be used for:
        </p>
        <ul className="grid sm:grid-cols-2 gap-4 text-left text-slate-200 text-lg">
          {USES.map((use) => (
            <li key={use} className="flex items-center gap-3 py-2 px-4 rounded-xl bg-white/10 border border-white/20 hover:border-white/30 hover:bg-white/15 transition-colors duration-200">
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[var(--brand-cyan)]" />
              {use}
            </li>
          ))}
        </ul>
        <p className="mt-12 text-white font-semibold text-lg">
          Your business. Your priorities.
        </p>
      </div>
    </section>
  );
}

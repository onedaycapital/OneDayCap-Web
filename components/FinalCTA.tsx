import { CTAButton } from "./CTAButton";

export function FinalCTA() {
  return (
    <section
      id="apply"
      className="relative py-28 px-6 bg-slate-900 overflow-hidden"
    >
      {/* Section 9: Blue + dots */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />
      <div className="relative max-w-2xl mx-auto text-center space-y-8">
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
          Get Capital Moving - Today
        </h2>
        <p className="text-slate-300 text-lg">
          See how much funding your business may qualify for in minutes.
        </p>
        <CTAButton href="/application" variant="primary" size="lg" showArrowOnHover>
          Apply Now
        </CTAButton>
      </div>
    </section>
  );
}

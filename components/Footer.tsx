import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative py-14 px-6 bg-white overflow-hidden">
      <div className="relative max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-bold text-lg">
              <span className="text-[var(--brand-blue)]">© One</span>
              <span className="text-[var(--brand-black)]">Day Capital</span>
            </p>
            <p className="text-slate-600 text-sm mt-1">
              Business Funding Solutions ·{" "}
              <a href="mailto:subs@onedaycap.com" className="hover:text-[var(--brand-blue)] transition-colors duration-200">
                subs@onedaycap.com
              </a>
            </p>
          </div>
          <nav className="flex gap-6 text-sm">
            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-[var(--brand-black)] transition-colors duration-200">
              Terms & Privacy Policy
            </Link>
          </nav>
        </div>
        <p className="text-slate-600 text-sm">
          Funding subject to approval. Terms and timing may vary based on
          business performance.
        </p>
        <div className="text-slate-500 text-xs leading-relaxed space-y-2 pt-6 border-t border-slate-200">
          <p>
            *Rewards are promotional in nature and are not tied to loan terms,
            pricing, approval odds, or funding conditions. Eligibility and
            reward tier are based on total funded amount and are subject to
            funder approval, program rules, and reward availability. One reward
            per business per funded transaction. Rewards fulfilled after funding
            and verification. Program may be modified or discontinued at any
            time.
          </p>
          <p>
            OneDay Capital does not provide funding directly and works with a
            network of funding providers.
          </p>
        </div>
      </div>
    </footer>
  );
}

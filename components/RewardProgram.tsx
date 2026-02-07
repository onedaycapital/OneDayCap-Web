"use client";

import { useEffect, useRef, useState } from "react";
import { CTAButton } from "./CTAButton";
import { ConfettiReward } from "./ConfettiReward";
import { RewardSparkles } from "./RewardSparkles";

const TIERS = [
  { min: 50, label: "$50k+", reward: "AirPods Pro 3 earbuds" },
  { min: 100, label: "$100k+", reward: "iPad Air" },
  { min: 150, label: "$150k+", reward: "iPhone 17" },
  { min: 250, label: "$250k+", reward: "Apple MacBook Air" },
  { min: 500, label: "$500k+", reward: "Travel rewards (up to $5,000 value)" },
];

export function RewardProgram() {
  const sectionRef = useRef<HTMLElement>(null);
  const [tilesVisible, setTilesVisible] = useState(false);
  const [confettiTriggered, setConfettiTriggered] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setTilesVisible(true);
          setConfettiTriggered(true);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="rewards" ref={sectionRef} className="relative py-24 px-6 bg-white overflow-hidden">
      {/* Section 4: White + diagonal lines */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 18px, rgba(29,91,184,0.06) 18px, rgba(29,91,184,0.06) 20px)",
        }}
        aria-hidden
      />
      <ConfettiReward trigger={confettiTriggered} />
      <RewardSparkles />

      <div className="relative max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row flex-wrap items-center justify-center gap-3 mb-4 text-center md:text-left">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-soft animate-soft-pulse" aria-hidden>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--brand-black)] tracking-tight">
            Customer Reward Program
          </h2>
          <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-[var(--brand-blue)]/15 to-[var(--brand-cyan)]/15 text-[var(--brand-blue)] border-2 border-[var(--brand-blue)]/30 shadow-soft ring-2 ring-[var(--brand-blue)]/10">
            Limited-Time
          </span>
        </div>
        <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto text-lg">
          Fund through OneDay Capital and qualified customers may receive a
          limited-time appreciation reward based on the total funded amount.*
        </p>

        <div className="flex flex-col lg:flex-row lg:flex-nowrap justify-center items-stretch gap-4 mb-14 lg:gap-6">
          {TIERS.map((tier, i) => (
            <div
              key={tier.min}
              className={`flex-shrink-0 w-full max-w-[280px] mx-auto lg:mx-0 lg:w-[200px] lg:min-w-[180px] min-h-[150px] flex flex-col justify-center bg-white/95 backdrop-blur rounded-2xl border-2 border-slate-200/80 p-5 shadow-soft transition-all duration-300 ease-out overflow-hidden group text-center ${
                tilesVisible ? "animate-tile-enter opacity-100" : "opacity-100"
              } hover:shadow-glow hover:-translate-y-1 hover:border-[var(--brand-blue)]/40 hover:shadow-[var(--brand-blue)]/20`}
              style={{
                animationDelay: tilesVisible ? `${i * 80}ms` : "0ms",
                animationFillMode: "forwards",
              }}
            >
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none" aria-hidden />
              <div className="relative text-sm font-bold text-[var(--brand-blue)] mb-2 text-center">
                Funding: {tier.label}
              </div>
              <div className="relative text-[var(--brand-black)] font-semibold text-base leading-snug text-center">
                Gift: {tier.reward}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center space-y-2">
          <CTAButton href="/application" variant="primary" size="lg" showArrowOnHover>
            Apply Now
          </CTAButton>
          <p className="text-sm text-slate-500 font-medium">Takes just minutes.</p>
        </div>
      </div>
    </section>
  );
}

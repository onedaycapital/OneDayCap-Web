"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const STAGES = [
  { id: 1, label: "Submitted", sublabel: "Your application has been received" },
  { id: 2, label: "Processing", sublabel: "We're reviewing your information" },
  { id: 3, label: "Matching with Funders", sublabel: "Finding the best funding options for you" },
  { id: 4, label: "Funder 1 Accepted", sublabel: "First funder has accepted your application" },
  { id: 5, label: "Funder 2 Accepted", sublabel: "Second funder has accepted your application" },
  { id: 6, label: "Funder Reviewing", sublabel: "Funders are conducting final review" },
  { id: 7, label: "Underwriting", sublabel: "Processing your application" },
  {
    id: 8,
    label: "Our Agent will get in touch. Congrats!",
    sublabel: null,
    isFinal: true,
  },
];

const MIN_INTERVAL_MS = 15000;
const MAX_INTERVAL_MS = 30000;

function getRandomInterval() {
  return MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
}

export function ProcessingFlowChart() {
  const [visibleCount, setVisibleCount] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [stageTimes, setStageTimes] = useState<number[]>([]);
  const stageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (visibleCount >= STAGES.length) return;

    const interval = getRandomInterval();
    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1);
      setStageTimes((prev) => [...prev, Math.round(interval / 1000)]);
    }, interval);

    return () => clearTimeout(timer);
  }, [visibleCount]);

  useEffect(() => {
    const activeIndex = visibleCount - 1;
    const activeEl = stageRefs.current[activeIndex];
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [visibleCount]);

  const progressPercent = (visibleCount / STAGES.length) * 100;

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-600">
            Elapsed: <strong>{Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, "0")}</strong>
          </span>
          <span className="text-sm font-medium text-slate-600">
            Stage {visibleCount}
          </span>
        </div>
        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-cyan)] transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="overflow-x-auto pb-4 -mx-2 scroll-smooth">
        <div className="flex items-start gap-0 min-w-max px-2">
          {STAGES.map((stage, index) => {
            const isVisible = index < visibleCount;
            const isActive = index === visibleCount - 1;
            const isLast = index === STAGES.length - 1;
            const showConnector = isVisible && !isLast;
            const connectorFilled = isVisible && index < visibleCount - 1;

            if (!isVisible) return null;

            return (
              <div
                key={stage.id}
                ref={(el) => { stageRefs.current[index] = el; }}
                className="flex items-start flex-shrink-0"
              >
                <div className="flex flex-col items-center w-36 sm:w-44">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 flex-shrink-0 transition-all duration-300 ${
                      isActive
                        ? "border-[var(--brand-blue)] bg-[var(--brand-blue)] text-white shadow-lg animate-step-glow"
                        : "border-[var(--brand-blue)] bg-white text-[var(--brand-blue)]"
                    }`}
                  >
                    {isActive && !stage.isFinal ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div
                    className={`mt-3 w-full rounded-xl border-2 p-3 text-center transition-all duration-300 ${
                      isActive
                        ? "border-[var(--brand-blue)]/40 bg-[var(--brand-blue)]/5 shadow-soft"
                        : "border-slate-200/80 bg-white shadow-soft"
                    }`}
                  >
                    <p className={`font-semibold text-xs sm:text-sm leading-tight ${stage.isFinal ? "text-[var(--brand-blue)]" : "text-[var(--brand-black)]"}`}>
                      {stage.label}
                    </p>
                    {stage.sublabel && (
                      <p className="mt-0.5 text-[10px] sm:text-xs text-slate-500 leading-tight">
                        {stage.sublabel}
                      </p>
                    )}
                    {stage.isFinal && (
                      <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200/60 text-left">
                        <p className="text-[10px] sm:text-xs text-amber-900 leading-tight">
                          You&apos;ve enrolled in our <strong>Reward Program</strong>. Qualified customers will receive appreciation rewards after funding.
                        </p>
                        <Link href="/#rewards" className="mt-1.5 inline-block text-[10px] sm:text-xs font-semibold text-[var(--brand-blue)] hover:underline">
                          View details →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {showConnector && (
                  <div className="flex items-center flex-shrink-0 pt-5 px-0.5">
                    <div className="w-6 sm:w-12 h-0.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-cyan)] transition-all duration-500 ${
                          connectorFilled ? "w-full" : "w-0"
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {stageTimes.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500 mb-2">Time per stage (seconds):</p>
          <div className="flex flex-wrap gap-2">
            {stageTimes.map((sec, i) => (
              <span key={i} className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-xs font-medium text-slate-600">
                Stage {i + 1}: {sec}s
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

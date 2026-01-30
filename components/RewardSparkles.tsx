"use client";

const SPARKLES = [
  { top: "10%", left: "15%", delay: "0s", size: 8 },
  { top: "20%", left: "85%", delay: "0.3s", size: 6 },
  { top: "50%", left: "8%", delay: "0.6s", size: 6 },
  { top: "55%", left: "92%", delay: "0.2s", size: 8 },
  { top: "75%", left: "20%", delay: "0.45s", size: 5 },
  { top: "70%", left: "78%", delay: "0.15s", size: 6 },
];

export function RewardSparkles() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {SPARKLES.map((s, i) => (
        <div
          key={i}
          className="absolute animate-sparkle rounded-full bg-amber-400/60"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
          }}
        />
      ))}
    </div>
  );
}

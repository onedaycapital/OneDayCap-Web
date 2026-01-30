"use client";

const COLORS = [
  "#1d5bb8",
  "#0ea5e9",
  "#f59e0b",
  "#10b981",
  "#ec4899",
  "#8b5cf6",
  "#ef4444",
  "#eab308",
];

function useConfettiPieces(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(i * 7) % 96}%`,
    delay: `${(i * 0.08) % 2.5}s`,
    color: COLORS[i % COLORS.length],
    size: 10 + (i % 5),
    rotation: (i % 6) * 30,
    duration: 4 + (i % 3),
  }));
}

type ConfettiRewardProps = {
  trigger?: boolean;
};

export function ConfettiReward({ trigger = false }: ConfettiRewardProps) {
  const pieces = useConfettiPieces(48);

  if (!trigger) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm opacity-100"
          style={{
            left: p.left,
            top: "-20px",
            width: p.size,
            height: p.size * (p.id % 2 === 0 ? 1.3 : 0.9),
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay} forwards`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }}
        />
      ))}
    </div>
  );
}

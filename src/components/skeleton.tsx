export function Skeleton() {
  const cards = [0, 1, 2];
  const cardDuration = 3200; // ms per full cycle
  const cardStagger = 600; // ms between cards

  return (
    <div className="flex flex-col gap-4 p-4">
      {cards.map((i) => (
        <SkeletonCard key={i} delay={i * cardStagger} duration={cardDuration} />
      ))}
    </div>
  );
}

function SkeletonCard({ delay, duration }: { delay: number; duration: number }) {
  // Border lines with crosshair overlap (5px past corners)
  const borders = [
    { x1: -5, y1: 0, x2: 405, y2: 0, length: 410 }, // top
    { x1: 400, y1: -5, x2: 400, y2: 85, length: 90 }, // right
    { x1: 405, y1: 80, x2: -5, y2: 80, length: 410 }, // bottom
    { x1: 0, y1: 85, x2: 0, y2: -5, length: 90 }, // left
  ];

  // Diagonal hatch lines at -45deg, clipped to card bounds
  // Lines go from upper-right to lower-left, spaced across the card
  const hatchLines: { x1: number; y1: number; x2: number; y2: number; length: number }[] = [];
  const hatchCount = 8;
  const hatchSpacing = 60; // px between diagonal line start positions
  for (let h = 0; h < hatchCount; h++) {
    const startX = 40 + h * hatchSpacing;
    // Line goes from (startX, 0) to (startX - 80, 80) at -45deg
    const endX = startX - 80;
    const length = Math.sqrt(80 * 80 + 80 * 80); // ~113
    hatchLines.push({ x1: startX, y1: 0, x2: endX, y2: 80, length: Math.round(length) });
  }

  const hatchStagger = 100; // ms between each hatch line

  return (
    <svg
      width="100%"
      height="80"
      viewBox="0 0 400 80"
      preserveAspectRatio="none"
      className="block"
    >
      <defs>
        <clipPath id="card-clip">
          <rect x="0" y="0" width="400" height="80" />
        </clipPath>
      </defs>

      {/* Border lines */}
      {borders.map((b, idx) => (
        <line
          key={`border-${idx}`}
          x1={b.x1}
          y1={b.y1}
          x2={b.x2}
          y2={b.y2}
          stroke="rgba(255, 255, 255, 0.8)"
          strokeWidth="1"
          className="animate-skeleton-border"
          style={{
            strokeDasharray: b.length,
            ['--dash-length' as string]: b.length,
            animationDelay: `${delay}ms`,
            animationDuration: `${duration}ms`,
          }}
        />
      ))}

      {/* Hatch lines (clipped to card bounds) */}
      <g clipPath="url(#card-clip)">
        {hatchLines.map((h, idx) => (
          <line
            key={`hatch-${idx}`}
            x1={h.x1}
            y1={h.y1}
            x2={h.x2}
            y2={h.y2}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1"
            className="animate-skeleton-hatch"
            style={{
              strokeDasharray: h.length,
              ['--dash-length' as string]: h.length,
              animationDelay: `${delay + idx * hatchStagger}ms`,
              animationDuration: `${duration}ms`,
            }}
          />
        ))}
      </g>
    </svg>
  );
}

'use client';

import { useEffect, useId, useRef } from 'react';

const CYCLE = 3200;
const CARD_STAGGER = 600;

function easeOut(t: number) {
  return 1 - (1 - t) ** 2;
}

/** Map progress to a 0-1 sub-range */
function phase(progress: number, start: number, end: number) {
  if (progress <= start) return 0;
  if (progress >= end) return 1;
  return (progress - start) / (end - start);
}

export function Skeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {[0, 1, 2].map((i) => (
        <SkeletonCard key={i} delay={i * CARD_STAGGER} />
      ))}
    </div>
  );
}

const BORDERS = [
  { x1: -5, y1: 0, x2: 405, y2: 0, length: 410 }, // top (L→R)
  { x1: 0, y1: -5, x2: 0, y2: 85, length: 90 }, // left (T→B, fast)
  { x1: -5, y1: 80, x2: 405, y2: 80, length: 410 }, // bottom (L→R)
  { x1: 400, y1: -5, x2: 400, y2: 85, length: 90 }, // right (T→B)
];

// Each border: [drawStart, drawEnd] as fraction of cycle
const BORDER_PHASES = [
  [0, 0.22], // top
  [0, 0.08], // left (fast)
  [0.12, 0.34], // bottom (delayed)
  [0.16, 0.28], // right
];

const HATCH_COUNT = 20;
const HATCH_SPACING = 25;
const HATCH_LINES = Array.from({ length: HATCH_COUNT }, (_, h) => {
  const startX = h * HATCH_SPACING;
  return {
    x1: startX,
    y1: 0,
    x2: startX - 80,
    y2: 80,
    length: Math.round(Math.sqrt(80 * 80 + 80 * 80)),
  };
});

function SkeletonCard({ delay }: { delay: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const clipId = useId();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const borderEls = svg.querySelectorAll<SVGLineElement>('.sk-border');
    const hatchEls = svg.querySelectorAll<SVGLineElement>('.sk-hatch');

    let frameId: number;
    const origin = performance.now();

    function tick(now: number) {
      const elapsed = now - origin - delay;

      // Hidden during initial delay
      if (elapsed < 0) {
        svg!.style.opacity = '0';
        frameId = requestAnimationFrame(tick);
        return;
      }

      const progress = (elapsed % CYCLE) / CYCLE;

      // Card fade: visible until 0.75, fade out 0.75→0.90, hidden 0.90→1.0
      const fade = phase(progress, 0.75, 0.9);
      svg!.style.opacity = String(1 - fade);

      // Borders
      borderEls.forEach((el, i) => {
        const [start, end] = BORDER_PHASES[i];
        const draw = easeOut(phase(progress, start, end));
        const len = BORDERS[i].length;
        el.setAttribute('stroke-dashoffset', String(len * (1 - draw)));
      });

      // Hatching: staggered draw from 0.18 to 0.65
      hatchEls.forEach((el, i) => {
        const stagger = (i / HATCH_COUNT) * 0.18;
        const draw = phase(progress, 0.18 + stagger, 0.28 + stagger);
        const len = HATCH_LINES[i].length;
        el.setAttribute('stroke-dashoffset', String(len * (1 - draw)));
        el.setAttribute('opacity', draw > 0 ? '1' : '0');
      });

      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [delay]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="80"
      viewBox="0 0 400 80"
      preserveAspectRatio="none"
      className="block"
      style={{ opacity: 0 }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width="400" height="80" />
        </clipPath>
      </defs>

      {BORDERS.map((b, i) => (
        <line
          key={i}
          className="sk-border"
          x1={b.x1}
          y1={b.y1}
          x2={b.x2}
          y2={b.y2}
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth="1"
          strokeDasharray={b.length}
          strokeDashoffset={b.length}
        />
      ))}

      <g clipPath={`url(#${clipId})`}>
        {HATCH_LINES.map((h, i) => (
          <line
            key={i}
            className="sk-hatch"
            x1={h.x1}
            y1={h.y1}
            x2={h.x2}
            y2={h.y2}
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1"
            strokeDasharray={h.length}
            strokeDashoffset={h.length}
            opacity="0"
          />
        ))}
      </g>
    </svg>
  );
}

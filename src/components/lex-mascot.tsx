'use client';

import Image from 'next/image';
import { useMascotState, type MascotState } from '@/contexts/mascot-context';

const MESSAGES: Record<MascotState, { text: string; accent?: string }[]> = {
  idle: [
    { text: "I'm Lex, the Linguistics Olympiad Problem solving duck! " },
    { text: 'Copy and paste', accent: 'true' },
    { text: ' a LO Problem below or try one of my examples!' },
  ],
  ready: [
    { text: "Ooh, that's a juicy one! Hit " },
    { text: 'Solve', accent: 'true' },
    { text: " whenever you're ready and I'll get quacking!" },
  ],
  solving: [{ text: 'Quack-ulating... my finest duck brains are on it!' }],
  solved: [{ text: "Duck yeah! The answer's all wrapped up. How'd I do?" }],
  error: [
    { text: 'Oh no, I ruffled my feathers on that one... Try again or paste a different problem!' },
  ],
};

export function LexMascot() {
  const { mascotState } = useMascotState();
  const segments = MESSAGES[mascotState];

  return (
    <div className="flex items-start">
      <Image
        src="/lex-mascot.png"
        alt="Lex the duck mascot"
        width={60}
        height={60}
        className="shrink-0"
      />

      {/* SVG tail — sits on top of the bubble's left border via z-10 */}
      <svg
        width="12"
        height="24"
        viewBox="0 0 12 24"
        className="relative z-10 mt-3 shrink-0"
        style={{ marginRight: '-1px' }}
      >
        <polygon points="0,12 12,0 12,24" style={{ fill: 'var(--surface-1)' }} stroke="none" />
        <polyline
          points="12,0 0,12 12,24"
          fill="none"
          style={{ stroke: 'var(--border-strong)' }}
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>

      {/* Speech bubble with crosshair corner extensions */}
      <div className="speech-bubble px-4 py-3">
        <p className="font-heading text-base leading-relaxed">
          {segments.map((seg, i) =>
            seg.accent ? (
              <span key={i} className="text-accent">
                {seg.text}
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </p>
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useMascotState, type MascotState } from '@/contexts/mascot-context';
import { getRandomMessage, type MessageSegment } from '@/lib/mascot-messages';
import { useTypewriter } from '@/hooks/use-typewriter';

const STATE_IMAGE: Record<MascotState, string> = {
  idle: '/lex-neutral.png',
  ready: '/lex-neutral.png',
  solving: '/lex-thinking.png',
  solved: '/lex-happy.png',
  error: '/lex-defeated.png',
  aborted: '/lex-neutral.png',
};

const ALL_IMAGES = [...new Set(Object.values(STATE_IMAGE))];

/** Reading pause (ms) before auto-cycling to next solving message */
const CYCLE_PAUSE_MS = 8000;

export function LexMascot() {
  const { mascotState } = useMascotState();
  const [currentMessage, setCurrentMessage] = useState<MessageSegment[]>(() =>
    getRandomMessage('idle'),
  );
  const prevStateRef = useRef<MascotState>(mascotState);
  const cycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { visibleSegments, isTyping, showCursor, isCollapsing } = useTypewriter(currentMessage);

  // Pick a new random message, avoiding the current one if possible
  const pickNewMessage = useCallback(
    (state: MascotState) => {
      let next = getRandomMessage(state);
      // Re-roll once to avoid repeats (best-effort)
      if (JSON.stringify(next) === JSON.stringify(currentMessage)) {
        next = getRandomMessage(state);
      }
      setCurrentMessage(next);
    },
    [currentMessage],
  );

  // Handle state changes: pick new message, cancel pending cycle timer
  useEffect(() => {
    if (mascotState !== prevStateRef.current) {
      prevStateRef.current = mascotState;
      if (cycleTimerRef.current) {
        clearTimeout(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
      pickNewMessage(mascotState);
    }
  }, [mascotState, pickNewMessage]);

  // Auto-cycle during solving: after typing finishes, wait CYCLE_PAUSE_MS then show next
  useEffect(() => {
    if (mascotState !== 'solving') return;
    if (isTyping) return;

    cycleTimerRef.current = setTimeout(() => {
      pickNewMessage('solving');
    }, CYCLE_PAUSE_MS);

    return () => {
      if (cycleTimerRef.current) {
        clearTimeout(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
    };
  }, [mascotState, isTyping, pickNewMessage]);

  // Preload all duck images on mount
  useEffect(() => {
    ALL_IMAGES.forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, []);

  // Cleanup cycle timer on unmount
  useEffect(() => {
    return () => {
      if (cycleTimerRef.current) {
        clearTimeout(cycleTimerRef.current);
      }
    };
  }, []);

  const imageSrc = STATE_IMAGE[mascotState];

  return (
    <div className="flex items-start">
      <Image
        src={imageSrc}
        alt="Lex the duck mascot"
        width={76}
        height={76}
        className="shrink-0"
        priority
      />

      {/* SVG tail -- sits on top of the bubble's left border via z-10 */}
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
          {visibleSegments.map((seg, i) =>
            seg.accent ? (
              <span key={i} className="text-accent">
                {seg.text}
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
          {showCursor && (
            <span
              className="text-accent ml-0.5 inline-block"
              style={{
                animation: isCollapsing
                  ? 'cursor-collapse 300ms ease-in forwards'
                  : 'blink-cursor 1s step-end infinite',
              }}
            >
              |
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

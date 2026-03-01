'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { MessageSegment } from '@/lib/mascot-messages';

interface UseTypewriterOptions {
  charDelay?: number;
  enabled?: boolean;
}

interface UseTypewriterResult {
  visibleSegments: MessageSegment[];
  isTyping: boolean;
}

/**
 * Animates an array of MessageSegment text letter-by-letter.
 * Returns the visible portion of segments and whether typing is in progress.
 */
export function useTypewriter(
  segments: MessageSegment[],
  options?: UseTypewriterOptions,
): UseTypewriterResult {
  const { charDelay = 30, enabled = true } = options ?? {};

  const totalChars = useMemo(
    () => segments.reduce((sum, seg) => sum + seg.text.length, 0),
    [segments],
  );

  // Stable key to detect when segments change
  const segmentsKey = useMemo(() => JSON.stringify(segments), [segments]);

  const [charIndex, setCharIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when segments change
  useEffect(() => {
    setCharIndex(0);
  }, [segmentsKey]);

  // Run the typing interval
  useEffect(() => {
    if (!enabled) return;

    if (charIndex >= totalChars) return;

    intervalRef.current = setInterval(() => {
      setCharIndex((prev) => {
        const next = prev + 1;
        if (next >= totalChars && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return next;
      });
    }, charDelay);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [segmentsKey, charDelay, enabled, totalChars, charIndex >= totalChars]);

  // If disabled, return all segments immediately
  if (!enabled) {
    return { visibleSegments: segments, isTyping: false };
  }

  // Derive visible segments from charIndex
  const visibleSegments: MessageSegment[] = [];
  let remaining = charIndex;

  for (const seg of segments) {
    if (remaining <= 0) break;

    if (remaining >= seg.text.length) {
      visibleSegments.push(seg);
      remaining -= seg.text.length;
    } else {
      visibleSegments.push({ ...seg, text: seg.text.slice(0, remaining) });
      remaining = 0;
    }
  }

  const isTyping = charIndex < totalChars;

  return { visibleSegments, isTyping };
}

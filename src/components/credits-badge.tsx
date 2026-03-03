'use client';

import { useState, useEffect } from 'react';

export function CreditsBadge() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCredits() {
      try {
        const res = await fetch('/api/credits');
        const data = await res.json();
        if (data.remaining !== null && data.remaining !== undefined) {
          setRemaining(data.remaining);
          setError(false);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
      setLoading(false);
    }

    fetchCredits();
    const interval = setInterval(fetchCredits, 20_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height="14"
        viewBox="0 -960 960 960"
        width="14"
        fill="currentColor"
        className="inline-block"
      >
        <path d="M460-300h40v-40h49.23q13.08 0 21.92-8.85 8.85-8.84 8.85-21.92v-98.46q0-13.08-8.85-21.92-8.84-8.85-21.92-8.85H420v-80h160v-40h-80v-40h-40v40h-49.23q-13.08 0-21.92 8.85-8.85 8.84-8.85 21.92v98.46q0 13.08 8.85 21.92 8.84 8.85 21.92 8.85H540v80H380v40h80v40ZM120-200v-560h720v560H120Zm40-40h640v-480H160v480Zm0 0v-480 480Z" />
      </svg>
      <span className="font-heading tabular-nums text-accent">
        {loading ? '--' : error ? 'ERR' : `$${remaining!.toFixed(2)}`}
      </span>
      <span className="font-heading text-muted-foreground">left</span>
    </div>
  );
}

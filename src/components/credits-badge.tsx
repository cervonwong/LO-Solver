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
      <span className="font-heading text-sm tabular-nums text-accent">
        {loading ? '--' : error ? 'ERR' : `$${remaining!.toFixed(2)}`}
      </span>
      <span className="font-heading text-muted-foreground">left</span>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useApiKey } from '@/hooks/use-api-key';

interface CreditsBadgeProps {
  onClick?: () => void;
}

export function CreditsBadge({ onClick }: CreditsBadgeProps) {
  const [apiKey] = useApiKey();
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
    <button
      type="button"
      onClick={onClick}
      className="hover-hatch-cyan cursor-pointer flex flex-col items-start gap-0.5 px-2 py-1 text-xs"
    >
      {/* Key status row */}
      <div className="flex items-center gap-1.5">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="14"
          viewBox="0 -960 960 960"
          width="14"
          fill="currentColor"
          className={apiKey ? 'text-accent' : 'text-muted-foreground'}
        >
          <path d="M280-400q-33 0-56.5-23.5T200-480q0-33 23.5-56.5T280-560q33 0 56.5 23.5T360-480q0 33-23.5 56.5T280-400Zm0 160q-100 0-170-70T40-480q0-100 70-170t170-70q67 0 121.5 33T492-600h348l120 120-180 180-120-80-80 80-68-68h-20q-36 54-90.5 87T280-248Zm0-40q60 0 109-32.5t69-87.5h114l46 46 82-82 92 62 110-110-60-60H458q-20-55-69-87.5T280-672q-83 0-141.5 58.5T80-472q0 83 58.5 141.5T280-272Z" />
        </svg>
        <span
          className={`font-heading text-sm ${apiKey ? 'text-accent' : 'text-muted-foreground'}`}
        >
          {apiKey ? `sk-...${apiKey.slice(-4)}` : 'Add key'}
        </span>
      </div>
      {/* Credits row */}
      <div className="flex items-center gap-1.5">
        <span className="font-heading text-sm tabular-nums text-accent">
          {loading ? '--' : error ? 'ERR' : `$${remaining!.toFixed(2)}`}
        </span>
        <span className="font-heading text-muted-foreground">left</span>
      </div>
    </button>
  );
}

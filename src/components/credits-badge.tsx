'use client';

import { useState, useEffect } from 'react';
import { useApiKey } from '@/hooks/use-api-key';
import { KeyIcon, KeyAlertIcon } from '@/components/icons/key-icon';

interface CreditsBadgeProps {
  onClick?: () => void;
  onServerKeyStatus?: (hasServerKey: boolean) => void;
}

export function CreditsBadge({ onClick, onServerKeyStatus }: CreditsBadgeProps) {
  const [apiKey] = useApiKey();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchCredits() {
      try {
        const res = await fetch('/api/credits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiKey ? { key: apiKey } : {}),
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (data.remaining !== null && data.remaining !== undefined) {
          setRemaining(data.remaining);
          setError(false);
        } else {
          setError(true);
        }
        const serverKey = typeof data.hasServerKey === 'boolean' ? data.hasServerKey : null;
        setHasServerKey(serverKey);
        if (serverKey !== null) {
          onServerKeyStatus?.(serverKey);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError(true);
        }
      }
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }

    fetchCredits();
    const interval = setInterval(fetchCredits, 20_000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [apiKey, onServerKeyStatus]);

  const hasAnyKey = !!apiKey || hasServerKey === true;

  return (
    <button
      type="button"
      onClick={onClick}
      className="hover-hatch-cyan cursor-pointer flex flex-col items-start gap-0 px-2 py-1 text-xs"
    >
      {/* Key status row */}
      <div className="flex items-center gap-1.5">
        {hasAnyKey ? (
          <KeyIcon className="text-muted-foreground" />
        ) : (
          <KeyAlertIcon className="text-status-warning animate-pulse" />
        )}
        <span
          className={`font-heading text-xs ${
            hasAnyKey ? 'text-muted-foreground' : 'text-status-warning animate-pulse'
          }`}
        >
          {apiKey ? `sk-...${apiKey.slice(-4)}` : 'Add key'}
        </span>
      </div>
      {/* Credits row — hidden when no key is available */}
      {hasAnyKey && (
        <div className="flex items-center gap-1.5">
          <span className="font-heading text-sm tabular-nums text-accent">
            {loading ? '--' : error ? 'ERR' : `$${remaining!.toFixed(2)}`}
          </span>
          <span className="font-heading text-muted-foreground">left</span>
        </div>
      )}
    </button>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useApiKey } from '@/hooks/use-api-key';
import { isClaudeCodeMode, isOpenRouterMode } from '@/hooks/use-provider-mode';
import { useClaudeAuth } from '@/hooks/use-claude-auth';
import { useWorkflowControl } from '@/contexts/workflow-control-context';
import { KeyIcon, KeyAlertIcon } from '@/components/icons/key-icon';

type ProviderMode =
  | 'openrouter-testing'
  | 'openrouter-production'
  | 'claude-code-testing'
  | 'claude-code-production';

function formatCompactTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

interface CreditsBadgeProps {
  providerMode: ProviderMode;
  onClick?: (() => void) | undefined;
  onServerKeyStatus?: ((hasServerKey: boolean) => void) | undefined;
}

export function CreditsBadge({ providerMode, onClick, onServerKeyStatus }: CreditsBadgeProps) {
  const isCcMode = isClaudeCodeMode(providerMode);
  const isOrMode = isOpenRouterMode(providerMode);

  // Claude Code auth polling (only active in CC mode)
  const { authenticated, loading: authLoading } = useClaudeAuth(isCcMode);

  // Live cost data from workflow context
  const { ccCostData } = useWorkflowControl();

  // OpenRouter credits polling (only active in OR mode)
  const [apiKey] = useApiKey();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isOrMode) return;

    async function fetchCredits() {
      try {
        const url = apiKey ? `/api/credits?key=${encodeURIComponent(apiKey)}` : '/api/credits';
        const res = await fetch(url);
        const data = await res.json();
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
        setError(true);
      }
      setLoading(false);
    }

    fetchCredits();
    const interval = setInterval(fetchCredits, 20_000);
    return () => clearInterval(interval);
  }, [apiKey, onServerKeyStatus, isOrMode]);

  // Claude Code mode rendering
  if (isCcMode) {
    return (
      <div className="flex flex-col items-start gap-0 px-2 py-1 text-xs">
        {/* Auth status row */}
        <div className="flex items-center gap-1.5">
          {authLoading ? (
            <span className="font-heading text-xs text-muted-foreground">Checking...</span>
          ) : authenticated ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="14"
                viewBox="0 -960 960 960"
                width="14"
                fill="currentColor"
                className="text-status-success"
              >
                <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
              </svg>
              <span className="font-heading text-xs text-status-success">Claude Code</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="14"
                viewBox="0 -960 960 960"
                width="14"
                fill="currentColor"
                className="animate-pulse text-status-warning"
              >
                <path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z" />
              </svg>
              <span className="animate-pulse font-heading text-xs text-status-warning">
                Run <code className="font-mono text-[10px]">claude login</code>
              </span>
            </>
          )}
        </div>
        {/* Cost/token row */}
        <div className="flex items-center gap-1.5">
          <span className="font-heading text-sm tabular-nums text-accent">
            {ccCostData
              ? `${formatCompactTokens(ccCostData.cumulativeTokens)} tokens (~$${ccCostData.cumulativeCost.toFixed(2)})`
              : 'Subscription'}
          </span>
        </div>
      </div>
    );
  }

  // OpenRouter mode rendering (unchanged)
  const hasAnyKey = !!apiKey || hasServerKey === true;

  return (
    <button
      type="button"
      onClick={onClick}
      className="hover-hatch-cyan flex cursor-pointer flex-col items-start gap-0 px-2 py-1 text-xs"
    >
      {/* Key status row */}
      <div className="flex items-center gap-1.5">
        {hasAnyKey ? (
          <KeyIcon className="text-muted-foreground" />
        ) : (
          <KeyAlertIcon className="animate-pulse text-status-warning" />
        )}
        <span
          className={`font-heading text-xs ${
            hasAnyKey ? 'text-muted-foreground' : 'animate-pulse text-status-warning'
          }`}
        >
          {apiKey ? `sk-...${apiKey.slice(-4)}` : 'Add key'}
        </span>
      </div>
      {/* Credits row -- hidden when no key is available */}
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

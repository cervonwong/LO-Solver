'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ClaudeAuthState {
  authenticated: boolean;
  loading: boolean;
  email?: string;
}

export function useClaudeAuth(enabled: boolean): ClaudeAuthState {
  const [state, setState] = useState<ClaudeAuthState>({
    authenticated: false,
    loading: enabled,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/claude-auth');
      const data = await res.json();
      setState({
        authenticated: data.authenticated === true,
        loading: false,
        email: data.email ?? undefined,
      });
    } catch {
      setState({ authenticated: false, loading: false });
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState({ authenticated: false, loading: false });
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Fetch immediately
    setState((prev) => ({ ...prev, loading: true }));
    fetchAuth();

    // Poll every 20 seconds
    intervalRef.current = setInterval(fetchAuth, 20_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, fetchAuth]);

  return state;
}

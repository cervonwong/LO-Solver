import { useEffect, useState } from 'react';

/**
 * Returns a boolean indicating whether the given media query matches.
 * SSR-safe: defaults to `true` (desktop) when window is undefined, then syncs on mount.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(true);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

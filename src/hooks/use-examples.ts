'use client';

import { useEffect, useState } from 'react';

export function useExamples() {
  const [examples, setExamples] = useState<Array<{ id: string; label: string; type: string }>>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/examples', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!controller.signal.aborted) setExamples(data.examples);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return { examples };
}

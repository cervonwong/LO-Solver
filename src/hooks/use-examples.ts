'use client';

import { useEffect, useState } from 'react';

export function useExamples() {
  const [examples, setExamples] = useState<Array<{ id: string; label: string; type: string }>>([]);

  useEffect(() => {
    fetch('/api/examples')
      .then((res) => res.json())
      .then((data) => setExamples(data.examples))
      .catch(() => {});
  }, []);

  return { examples };
}

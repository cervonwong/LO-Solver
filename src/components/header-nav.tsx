'use client';

import { useRouter } from 'next/navigation';
import { useRunContext } from './run-context';

export function HeaderNav() {
  const { isRunning, stopRun } = useRunContext();
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    if (!isRunning) return;

    e.preventDefault();
    const confirmed = window.confirm(
      'A workflow is currently running. Navigating away will kill the current run. Continue?',
    );
    if (confirmed) {
      stopRun();
      router.push('/');
    }
  };

  return (
    <a href="/" className="text-lg font-semibold" onClick={handleClick}>
      LO-Solver
    </a>
  );
}

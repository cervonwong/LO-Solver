'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const EXAMPLES = [
  {
    label: 'Saisiyat (UKLO 2025)',
    filename: 'uklo_2025R1P3_MoSy_Rosetta_Austr_Saisiyat_Input.md',
  },
  {
    label: 'Forest Enets (Onling 2024)',
    filename: 'onling_2024P1_MoSyPh_Rosetta_Uralic_Forest-Enets_Input.md',
  },
  {
    label: 'Okinawan (Onling 2024)',
    filename: 'onling_2024P3_MoSyPh_Rosetta_Japonic_Okinawan_Input.md',
  },
];

export default function Home() {
  const [problemText, setProblemText] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const loadExample = async (filename: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/examples/${encodeURIComponent(filename)}`);
      if (res.ok) {
        const text = await res.text();
        setProblemText(text);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!problemText.trim()) return;
    const runId = crypto.randomUUID();
    sessionStorage.setItem(`run-${runId}`, problemText);
    router.push(`/run/${runId}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold">Linguistics Olympiad Solver</h1>
      <p className="mt-2 text-muted-foreground">
        Paste a Rosetta Stone linguistics problem below and watch the AI pipeline solve it step by
        step.
      </p>

      <div className="mt-6 border-t pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Load example:</span>
          {EXAMPLES.map((ex) => (
            <Button
              key={ex.filename}
              variant="outline"
              size="sm"
              onClick={() => loadExample(ex.filename)}
              disabled={loading}
            >
              {ex.label}
            </Button>
          ))}
        </div>
      </div>

      <Textarea
        className="mt-4 min-h-[300px] font-mono text-sm"
        placeholder="Paste your linguistics problem here..."
        value={problemText}
        onChange={(e) => setProblemText(e.target.value)}
      />

      <Button
        className="mt-4 px-8 font-semibold"
        size="lg"
        onClick={handleSubmit}
        disabled={!problemText.trim()}
      >
        Solve
      </Button>
    </div>
  );
}

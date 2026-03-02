import type { Metadata } from 'next';
import { Noto_Sans, Architects_Daughter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import 'streamdown/styles.css';
import { ModelModeToggle } from '@/components/model-mode-toggle';
import { WorkflowSliders } from '@/components/workflow-sliders';

const notoSans = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const architectsDaughter = Architects_Daughter({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LO-Solver',
  description: 'AI-powered Linguistics Olympiad Rosetta Stone solver',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${notoSans.variable} ${architectsDaughter.variable}`}>
      <body className="flex h-full flex-col gap-1 bg-background font-sans text-foreground antialiased">
        <nav className="frosted flex shrink-0 items-center justify-between border border-border px-6 py-3">
          <Link
            href="/"
            className="hover-hatch-cyan font-heading text-sm text-foreground/80"
          >
            LO-Solver
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/evals"
              className="hover-hatch-cyan font-heading text-sm text-foreground/80"
            >
              Eval Results
            </Link>
            <div className="h-5 w-px bg-border" />
            <WorkflowSliders />
            <div className="h-5 w-px bg-border" />
            <ModelModeToggle />
          </div>
        </nav>
        <main className="min-h-0 flex-1">{children}</main>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Noto_Sans, Architects_Daughter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import 'streamdown/styles.css';
import { ModelModeToggle } from '@/components/model-mode-toggle';

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
      <body className="flex h-full flex-col bg-background font-sans text-foreground antialiased">
        <nav className="frosted flex shrink-0 items-center justify-between border border-border px-6 py-3">
          <Link
            href="/"
            className="font-heading text-sm text-foreground/80 transition-colors hover:text-foreground"
          >
            LO-Solver
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/evals"
              className="font-heading text-sm text-foreground/80 transition-colors hover:text-foreground"
            >
              Eval Results
            </Link>
            <ModelModeToggle />
          </div>
        </nav>
        <main className="min-h-0 flex-1">{children}</main>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import { ModelModeToggle } from '@/components/model-mode-toggle';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'LO-Solver',
  description: 'AI-powered Linguistics Olympiad Rosetta Stone solver',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="flex h-full flex-col bg-background font-sans text-foreground antialiased">
        <nav className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
          <span className="text-lg font-semibold tracking-tight">LO-Solver</span>
          <div className="flex items-center gap-3">
            <ModelModeToggle />
            <div className="h-5 w-px bg-border" />
            <ThemeToggle />
          </div>
        </nav>
        <main className="min-h-0 flex-1">{children}</main>
      </body>
    </html>
  );
}

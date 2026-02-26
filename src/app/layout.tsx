import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LO-Solver',
  description: 'Linguistics Olympiad problem solver',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex h-full flex-col bg-background font-mono text-foreground antialiased">
        <nav className="shrink-0 border-b border-border px-6 py-3">
          <span className="text-lg font-bold tracking-tight">LO-Solver</span>
        </nav>
        <main className="min-h-0 flex-1">{children}</main>
      </body>
    </html>
  );
}

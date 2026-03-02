import type { Metadata } from 'next';
import { Noto_Sans, Architects_Daughter } from 'next/font/google';
import './globals.css';
import 'streamdown/styles.css';
import { LayoutShell } from '@/components/layout-shell';

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
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { RunContextProvider } from '@/components/run-context';
import { HeaderNav } from '@/components/header-nav';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LO-Solver',
  description: 'Linguistics Olympiad problem solver',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <RunContextProvider>
          <header className="border-b px-6 py-3 flex items-center justify-between">
            <HeaderNav />
            <span className="text-xs text-muted-foreground">
              Linguistics Olympiad Problem Solver
            </span>
          </header>
          <main>{children}</main>
        </RunContextProvider>
      </body>
    </html>
  );
}

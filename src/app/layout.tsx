import type { Metadata } from 'next';
import { Fredoka, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Navigation } from '@/components/layout/Navigation';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { Providers } from '@/app/providers';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

const display = Fredoka({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'English Vocab Trainer',
  description: 'Interaktywna aplikacja do nauki słówek angielskich z AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className={`${sans.variable} ${display.variable} font-sans antialiased`}>
        <Providers>
          <div className="min-h-screen">
            <Navigation />
            <main className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-10 md:pl-24">
              {children}
            </main>
            <ClientLayout />
          </div>
        </Providers>
      </body>
    </html>
  );
}

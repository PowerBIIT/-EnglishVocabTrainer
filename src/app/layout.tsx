import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Navigation } from '@/components/layout/Navigation';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { Providers } from '@/app/providers';

const sans = localFont({
  src: [
    {
      path: '../fonts/PlusJakartaSans-latin-var.woff2',
      weight: '200 800',
      style: 'normal',
    },
  ],
  variable: '--font-sans',
  display: 'swap',
});

const display = localFont({
  src: [
    {
      path: '../fonts/Fredoka-latin-var.woff2',
      weight: '300 700',
      style: 'normal',
    },
  ],
  variable: '--font-display',
  display: 'swap',
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
    <html lang="uk" suppressHydrationWarning>
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

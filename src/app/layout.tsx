import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/layout/Navigation';
import { ClientLayout } from '@/components/layout/ClientLayout';

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
      <body className="font-sans antialiased">
        <div className="min-h-screen flex flex-col">
          <main className="flex-1 pb-20">{children}</main>
          <Navigation />
          <ClientLayout />
        </div>
      </body>
    </html>
  );
}

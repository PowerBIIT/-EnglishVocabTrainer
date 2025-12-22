'use client';

import { useEffect } from 'react';
import { ArrowLeft, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { useHydration } from '@/lib/store';
import { useLanguage } from '@/lib/i18n';
import { WordIntake, wordIntakeCopy } from '@/components/ai/WordIntake';

type IntakeCopy = typeof wordIntakeCopy.pl;

export default function ChatPage() {
  const hydrated = useHydration();
  const language = useLanguage();
  const t = (wordIntakeCopy[language] ?? wordIntakeCopy.pl) as IntakeCopy;

  useEffect(() => {
    document.body.classList.add('chat-page');
    return () => {
      document.body.classList.remove('chat-page');
    };
  }, []);

  if (!hydrated) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] max-w-3xl mx-auto overflow-hidden">
      <header className="sticky top-0 z-20">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200/70 dark:border-slate-700/70 pt-[env(safe-area-inset-top)]">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/80 dark:bg-slate-900/80 shadow-sm px-3 py-2.5">
              <Link
                href="/"
                aria-label="Powrót"
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                <ArrowLeft size={22} />
              </Link>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-amber-400 flex items-center justify-center shadow-sm">
                  <Wand2 size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {t.assistantTitle}
                  </h1>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                    <span className="truncate">{t.assistantSubtitle}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <WordIntake variant="chat" className="flex-1" />
    </div>
  );
}

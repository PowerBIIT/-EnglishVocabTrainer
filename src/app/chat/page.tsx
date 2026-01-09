'use client';
import { ArrowLeft, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { useHydration } from '@/lib/store';
import { useLanguage } from '@/lib/i18n';
import { WordIntake, wordIntakeCopy } from '@/components/ai/WordIntake';
import { FullscreenPage } from '@/components/layout/FullscreenPage';

type IntakeCopy = typeof wordIntakeCopy.pl;

export default function ChatPage() {
  const hydrated = useHydration();
  const language = useLanguage();
  const t = (wordIntakeCopy[language] ?? wordIntakeCopy.pl) as IntakeCopy;

  return (
    <FullscreenPage className="w-full max-w-6xl mx-auto chat-fullscreen">
      {!hydrated ? (
        <div className="flex-1 p-4 flex items-center justify-center">
          <p className="text-slate-500">{t.loading}</p>
        </div>
      ) : (
        <>
          <header className="sticky top-0 z-20">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-primary-100/50 dark:border-primary-900/50 pt-[env(safe-area-inset-top)]">
              <div className="px-4 py-2.5 sm:py-3">
                <div className="flex items-center gap-3 rounded-2xl border border-primary-100/50 dark:border-primary-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm shadow-lg shadow-primary-500/5 px-3 py-2 sm:py-2.5">
                  <Link
                    href="/"
                    aria-label="Powrót"
                    className="p-2 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/30 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    <ArrowLeft size={22} />
                  </Link>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-primary-500 via-blue-500 to-pink-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                      <Wand2 size={18} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent truncate">
                        {t.assistantTitle}
                      </h1>
                      <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" />
                        <span className="truncate">{t.assistantSubtitle}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <WordIntake variant="chat" className="flex-1 px-4 pb-4" />
        </>
      )}
    </FullscreenPage>
  );
}

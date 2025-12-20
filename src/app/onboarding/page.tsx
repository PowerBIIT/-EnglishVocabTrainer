'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Flag, Sparkles, CheckCircle2 } from 'lucide-react';
import { mascotSkins } from '@/data/mascotSkins';
import { MascotSkinCard } from '@/components/mascot/MascotSkinCard';
import { Button } from '@/components/ui/Button';
import { FlashcardSession } from '@/components/flashcard/Flashcard';
import { useHydration, useVocabStore } from '@/lib/store';
import { parseVocabularyInput } from '@/lib/parseVocabulary';
import { generateId } from '@/lib/utils';

const MISSION_WORDS = 3;

type Step = 'skin' | 'words' | 'mission' | 'done';

export default function OnboardingPage() {
  const hydrated = useHydration();
  const router = useRouter();
  const { data: session, update } = useSession();
  const [step, setStep] = useState<Step>('skin');
  const [selectedSkin, setSelectedSkin] = useState(session?.user?.mascotSkin || 'explorer');
  const [setName, setSetName] = useState('');
  const [rawWords, setRawWords] = useState('');
  const [onboardingSetId, setOnboardingSetId] = useState<string | null>(null);
  const [onboardingSetName, setOnboardingSetName] = useState('');
  const vocabulary = useVocabStore((state) => state.vocabulary);
  const addVocabulary = useVocabStore((state) => state.addVocabulary);
  const createSet = useVocabStore((state) => state.createSet);

  const parsedWords = useMemo(() => parseVocabularyInput(rawWords), [rawWords]);
  const canStartMission = setName.trim().length > 0 && parsedWords.length >= MISSION_WORDS;

  const missionWords = useMemo(() => {
    if (onboardingSetId) {
      return vocabulary
        .filter((word) => (word.setIds ?? []).includes(onboardingSetId))
        .slice(0, MISSION_WORDS);
    }
    return vocabulary.slice(0, MISSION_WORDS);
  }, [onboardingSetId, vocabulary]);

  const stepIndex =
    step === 'skin' ? 1 : step === 'words' ? 2 : step === 'mission' ? 3 : 4;
  const totalSteps = 4;

  if (!hydrated) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Ładowanie...</p>
      </div>
    );
  }

  const saveSkin = async () => {
    await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mascotSkin: selectedSkin }),
    });

    await update({ mascotSkin: selectedSkin });
  };

  const handleCreateSet = () => {
    const trimmedName = setName.trim();
    if (!trimmedName || parsedWords.length < MISSION_WORDS) {
      return;
    }

    const newSet = createSet(trimmedName);
    const newVocab = parsedWords.map((word) => ({
      id: generateId(),
      en: word.en,
      phonetic: word.phonetic,
      pl: word.pl,
      category: trimmedName,
      setIds: [newSet.id],
      difficulty: word.difficulty,
      created_at: new Date(),
      source: 'manual' as const,
    }));

    addVocabulary(newVocab);
    setOnboardingSetId(newSet.id);
    setOnboardingSetName(newSet.name);
    setStep('mission');
  };

  const completeOnboarding = async () => {
    await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboardingComplete: true, mascotSkin: selectedSkin }),
    });

    await update({ onboardingComplete: true, mascotSkin: selectedSkin });
    setStep('done');
    setTimeout(() => router.push('/'), 600);
  };

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Onboarding</p>
            <h1 className="font-display text-3xl text-slate-900 dark:text-white">
              Start przygody
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 dark:bg-slate-900/60 px-4 py-2 text-sm text-slate-600">
            <Flag size={16} className="text-primary-600" />
            Krok {stepIndex} z {totalSteps}
          </div>
        </header>

        {step === 'skin' && (
          <section className="space-y-6">
            <div className="rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-white/50 shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                    Wybierz styl przewodnika
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Twój mascot będzie prowadził misje i nagrody.
                  </p>
                </div>
                <Sparkles className="text-amber-500" size={20} />
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {mascotSkins.map((skin) => (
                  <MascotSkinCard
                    key={skin.id}
                    skin={skin}
                    selected={selectedSkin === skin.id}
                    onSelect={setSelectedSkin}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={async () => {
                  await saveSkin();
                  setStep('words');
                }}
              >
                Zaczynamy misję
              </Button>
            </div>
          </section>
        )}

        {step === 'words' && (
          <section className="space-y-6">
            <div className="rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-white/50 shadow-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                    Dodaj pierwszy zestaw słówek
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Wklej słówka w formacie: <span className="font-medium">word - tłumaczenie</span>.
                  </p>
                </div>
                <Sparkles className="text-primary-600" size={20} />
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Nazwa zestawu
                  </label>
                  <input
                    type="text"
                    value={setName}
                    onChange={(e) => setSetName(e.target.value)}
                    placeholder="Np. Klasówka z biologii"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Słówka (min. {MISSION_WORDS})
                  </label>
                  <textarea
                    value={rawWords}
                    onChange={(e) => setRawWords(e.target.value)}
                    placeholder="apple - jabłko&#10;pear - gruszka&#10;plum - śliwka"
                    rows={4}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Wykryte słówka: {parsedWords.length}</span>
                <span>Wymagane: {MISSION_WORDS}</span>
              </div>

              <div className="flex justify-end">
                <Button size="lg" onClick={handleCreateSet} disabled={!canStartMission}>
                  Przejdź do misji
                </Button>
              </div>
            </div>
          </section>
        )}

        {step === 'mission' && (
          <section className="space-y-6">
            <div className="rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-white/50 shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                    Pierwsza misja
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Ukończ mini sesję z trzema fiszkami{onboardingSetName ? ` z zestawu "${onboardingSetName}"` : ''}.
                  </p>
                </div>
                <Sparkles className="text-primary-600" size={20} />
              </div>
              <div className="mt-6">
                {missionWords.length > 0 ? (
                  <FlashcardSession
                    words={missionWords}
                    onComplete={completeOnboarding}
                  />
                ) : (
                  <p className="text-sm text-slate-500">Brak słówek do misji.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {step === 'done' && (
          <section className="rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-white/50 shadow-xl p-8 text-center">
            <CheckCircle2 className="mx-auto text-success-500" size={48} />
            <h2 className="mt-4 text-2xl font-semibold text-slate-800 dark:text-slate-100">
              Misja zaliczona
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Przenosimy Cię do głównej bazy.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

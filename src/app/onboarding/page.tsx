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
import { useLanguage } from '@/lib/i18n';

const MISSION_WORDS = 3;

type Step = 'skin' | 'words' | 'mission' | 'done';

const onboardingCopy = {
  pl: {
    loading: 'Ładowanie...',
    title: 'Start przygody',
    stepLabel: (current: number, total: number) => `Krok ${current} z ${total}`,
    chooseSkin: 'Wybierz styl przewodnika',
    chooseSkinDesc: 'Twój mascot będzie prowadził misje i nagrody.',
    startMission: 'Zaczynamy misję',
    addFirstSet: 'Dodaj pierwszy zestaw słówek',
    addFirstSetDesc: 'Wklej słówka w formacie: word - tłumaczenie.',
    formatHint: 'word - tłumaczenie',
    setNameLabel: 'Nazwa zestawu',
    setNamePlaceholder: 'Np. Klasówka z biologii',
    wordsLabel: (min: number) => `Słówka (min. ${min})`,
    wordsPlaceholder: 'apple - jabłko\npear - gruszka\nplum - śliwka',
    detectedWords: (count: number) => `Wykryte słówka: ${count}`,
    requiredWords: (count: number) => `Wymagane: ${count}`,
    goToMission: 'Przejdź do misji',
    firstMission: 'Pierwsza misja',
    firstMissionDesc: (setName: string) =>
      `Ukończ mini sesję z trzema fiszkami${setName ? ` z zestawu "${setName}"` : ''}.`,
    noWords: 'Brak słówek do misji.',
    missionComplete: 'Misja zaliczona',
    redirectNote: 'Przenosimy Cię do głównej bazy.',
  },
  en: {
    loading: 'Loading...',
    title: 'Start the adventure',
    stepLabel: (current: number, total: number) => `Step ${current} of ${total}`,
    chooseSkin: 'Choose your guide style',
    chooseSkinDesc: 'Your mascot will lead missions and rewards.',
    startMission: 'Start the mission',
    addFirstSet: 'Add your first word set',
    addFirstSetDesc: 'Paste words in the format: word - translation.',
    formatHint: 'word - translation',
    setNameLabel: 'Set name',
    setNamePlaceholder: 'e.g. Biology test',
    wordsLabel: (min: number) => `Words (min. ${min})`,
    wordsPlaceholder: 'apple - jabłko\npear - gruszka\nplum - śliwka',
    detectedWords: (count: number) => `Detected words: ${count}`,
    requiredWords: (count: number) => `Required: ${count}`,
    goToMission: 'Go to mission',
    firstMission: 'First mission',
    firstMissionDesc: (setName: string) =>
      `Complete a mini session of three flashcards${setName ? ` from "${setName}"` : ''}.`,
    noWords: 'No words for the mission.',
    missionComplete: 'Mission complete',
    redirectNote: 'Taking you to the main base.',
  },
} as const;

type OnboardingCopy = typeof onboardingCopy.pl;

export default function OnboardingPage() {
  const hydrated = useHydration();
  const router = useRouter();
  const { data: session, update } = useSession();
  const language = useLanguage();
  const t = (onboardingCopy[language] ?? onboardingCopy.pl) as OnboardingCopy;
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
        <p className="text-slate-500">{t.loading}</p>
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
              {t.title}
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 dark:bg-slate-900/60 px-4 py-2 text-sm text-slate-600">
            <Flag size={16} className="text-primary-600" />
            {t.stepLabel(stepIndex, totalSteps)}
          </div>
        </header>

        {step === 'skin' && (
          <section className="space-y-6">
            <div className="rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-white/50 shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                    {t.chooseSkin}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t.chooseSkinDesc}
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
                {t.startMission}
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
                    {t.addFirstSet}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t.addFirstSetDesc}{' '}
                    <span className="font-medium">{t.formatHint}</span>.
                  </p>
                </div>
                <Sparkles className="text-primary-600" size={20} />
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    {t.setNameLabel}
                  </label>
                  <input
                    type="text"
                    value={setName}
                    onChange={(e) => setSetName(e.target.value)}
                    placeholder={t.setNamePlaceholder}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    {t.wordsLabel(MISSION_WORDS)}
                  </label>
                  <textarea
                    value={rawWords}
                    onChange={(e) => setRawWords(e.target.value)}
                    placeholder={t.wordsPlaceholder}
                    rows={4}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{t.detectedWords(parsedWords.length)}</span>
                <span>{t.requiredWords(MISSION_WORDS)}</span>
              </div>

              <div className="flex justify-end">
                <Button size="lg" onClick={handleCreateSet} disabled={!canStartMission}>
                  {t.goToMission}
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
                    {t.firstMission}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t.firstMissionDesc(onboardingSetName)}
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
                  <p className="text-sm text-slate-500">{t.noWords}</p>
                )}
              </div>
            </div>
          </section>
        )}

        {step === 'done' && (
          <section className="rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-white/50 shadow-xl p-8 text-center">
            <CheckCircle2 className="mx-auto text-success-500" size={48} />
            <h2 className="mt-4 text-2xl font-semibold text-slate-800 dark:text-slate-100">
              {t.missionComplete}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t.redirectNote}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

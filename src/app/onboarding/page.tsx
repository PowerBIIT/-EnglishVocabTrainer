'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Flag, Sparkles } from 'lucide-react';
import { mascotSkins } from '@/data/mascotSkins';
import { MascotSkinCard } from '@/components/mascot/MascotSkinCard';
import { Button } from '@/components/ui/Button';
import { FlashcardSession } from '@/components/flashcard/Flashcard';
import { WordIntake } from '@/components/ai/WordIntake';
import { useHydration, useVocabStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useLanguage, type AppLanguage } from '@/lib/i18n';
import {
  DEFAULT_PAIR_ID,
  getLanguageLabel,
  getLearningPair,
  LEARNING_PAIRS,
  LEARNING_PAIR_SAMPLES,
} from '@/lib/languages';
import type { VocabularyItem } from '@/types';

const MISSION_WORDS = 3;

type Step = 'pair' | 'skin' | 'words' | 'mission' | 'done';

const detectPreferredLanguage = (): AppLanguage => {
  if (typeof navigator === 'undefined') return 'uk';
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  if (languages.some((lang) => lang.toLowerCase().startsWith('uk'))) return 'uk';
  if (languages.some((lang) => lang.toLowerCase().startsWith('ru'))) return 'uk';
  if (languages.some((lang) => lang.toLowerCase().startsWith('pl'))) return 'pl';
  if (languages.some((lang) => lang.toLowerCase().startsWith('en'))) return 'en';
  return 'uk';
};

const onboardingCopy = {
  pl: {
    loading: 'Ładowanie...',
    onboardingLabel: 'Onboarding',
    title: 'Start przygody',
    languageLabel: 'Język',
    stepLabel: (current: number, total: number) => `Krok ${current} z ${total}`,
    choosePair: 'Wybierz parę językową',
    choosePairDesc: 'To ustawia język interfejsu, AI oraz kierunek nauki.',
    choosePairHint: 'Możesz zmienić później w profilu.',
    choosePairAction: 'Dalej',
    chooseSkin: 'Wybierz styl przewodnika',
    chooseSkinDesc: 'Twój mascot będzie prowadził misje i nagrody.',
    startMission: 'Zaczynamy misję',
    addFirstSet: 'Dodaj pierwszy zestaw słówek',
    addFirstSetDesc: 'Wklej słówka w formacie: word - tłumaczenie. Możesz też użyć zdjęcia lub pliku.',
    formatHint: (example: string) => `Format: ${example}`,
    setNameLabel: 'Nazwa zestawu',
    setNamePlaceholder: 'Np. Klasówka z biologii',
    wordsLabel: (min: number) => `Słówka (min. ${min})`,
    wordsPlaceholder: (example: string) => `${example}\n...`,
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
    onboardingLabel: 'Onboarding',
    title: 'Start the adventure',
    languageLabel: 'Language',
    stepLabel: (current: number, total: number) => `Step ${current} of ${total}`,
    choosePair: 'Choose your learning pair',
    choosePairDesc: 'This sets the interface language, AI feedback, and learning direction.',
    choosePairHint: 'You can change it later in profile.',
    choosePairAction: 'Continue',
    chooseSkin: 'Choose your guide style',
    chooseSkinDesc: 'Your mascot will lead missions and rewards.',
    startMission: 'Start the mission',
    addFirstSet: 'Add your first word set',
    addFirstSetDesc: 'Paste words in the format: word - translation. You can also use a photo or file.',
    formatHint: (example: string) => `Format: ${example}`,
    setNameLabel: 'Set name',
    setNamePlaceholder: 'e.g. Biology test',
    wordsLabel: (min: number) => `Words (min. ${min})`,
    wordsPlaceholder: (example: string) => `${example}\n...`,
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
  uk: {
    loading: 'Завантаження...',
    onboardingLabel: 'Онбординг',
    title: 'Початок пригоди',
    languageLabel: 'Мова',
    stepLabel: (current: number, total: number) => `Крок ${current} з ${total}`,
    choosePair: 'Обери мовну пару',
    choosePairDesc: 'Це задає мову інтерфейсу, фідбек AI та напрям навчання.',
    choosePairHint: 'Можеш змінити пізніше в профілі.',
    choosePairAction: 'Далі',
    chooseSkin: 'Обери стиль провідника',
    chooseSkinDesc: 'Твій маскот веде місії та нагороди.',
    startMission: 'Почати місію',
    addFirstSet: 'Додай перший набір слів',
    addFirstSetDesc: 'Встав слова у форматі: слово - переклад. Можеш також використати фото або файл.',
    formatHint: (example: string) => `Формат: ${example}`,
    setNameLabel: 'Назва набору',
    setNamePlaceholder: 'Напр. Контрольна з біології',
    wordsLabel: (min: number) => `Слова (мін. ${min})`,
    wordsPlaceholder: (example: string) => `${example}\n...`,
    detectedWords: (count: number) => `Виявлено слів: ${count}`,
    requiredWords: (count: number) => `Потрібно: ${count}`,
    goToMission: 'Перейти до місії',
    firstMission: 'Перша місія',
    firstMissionDesc: (setName: string) =>
      `Пройди міні-сесію з трьома флешкартами${setName ? ` з набору "${setName}"` : ''}.`,
    noWords: 'Немає слів для місії.',
    missionComplete: 'Місію виконано',
    redirectNote: 'Переносимо до головної бази.',
  },
} as const;

type OnboardingCopy = typeof onboardingCopy.pl;


export default function OnboardingPage() {
  const hydrated = useHydration();
  const router = useRouter();
  const { data: session, update } = useSession();
  const language = useLanguage();
  const t = (onboardingCopy[language] ?? onboardingCopy.pl) as OnboardingCopy;
  const [step, setStep] = useState<Step>('pair');
  const [selectedSkin, setSelectedSkin] = useState(session?.user?.mascotSkin || 'explorer');
  const [onboardingSetId, setOnboardingSetId] = useState<string | null>(null);
  const [onboardingSetName, setOnboardingSetName] = useState('');
  const autoLanguageRef = useRef(false);
  const vocabulary = useVocabStore((state) => state.getActiveVocabulary());
  const allVocabulary = useVocabStore((state) => state.vocabulary);
  const sets = useVocabStore((state) => state.sets);
  const updateSettings = useVocabStore((state) => state.updateSettings);
  const settings = useVocabStore((state) => state.settings);
  const setLearningPair = useVocabStore((state) => state.setLearningPair);
  const activePair = getLearningPair(settings.learning.pairId);
  const examplePair = LEARNING_PAIR_SAMPLES[activePair.id] ?? { target: 'word', native: 'translation' };

  const missionWords = useMemo(() => {
    if (onboardingSetId) {
      return vocabulary
        .filter((word) => (word.setIds ?? []).includes(onboardingSetId))
        .slice(0, MISSION_WORDS);
    }
    return vocabulary.slice(0, MISSION_WORDS);
  }, [onboardingSetId, vocabulary]);

  const stepIndex =
    step === 'pair'
      ? 1
      : step === 'skin'
      ? 2
      : step === 'words'
      ? 3
      : step === 'mission'
      ? 4
      : 5;
  const totalSteps = 5;

  useEffect(() => {
    if (!hydrated || autoLanguageRef.current) return;
    const isDefaultState =
      settings.learning.pairId === DEFAULT_PAIR_ID &&
      allVocabulary.length === 0 &&
      sets.length === 0;
    if (!isDefaultState) {
      autoLanguageRef.current = true;
      return;
    }
    const preferred = detectPreferredLanguage();
    if (preferred === 'uk') {
      setLearningPair(DEFAULT_PAIR_ID);
    } else if (preferred === 'pl') {
      setLearningPair('pl-en');
    }
    autoLanguageRef.current = true;
  }, [
    allVocabulary.length,
    hydrated,
    settings.learning.pairId,
    sets.length,
    setLearningPair,
  ]);

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

  const handleWordsAdded = (payload: {
    setId: string;
    setName: string;
    wordCount: number;
  }) => {
    setOnboardingSetId(payload.setId);
    setOnboardingSetName(payload.setName);
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
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-slate-500">{t.onboardingLabel}</p>
            <h1 className="font-display text-3xl text-slate-900 dark:text-white">
              {t.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 dark:bg-slate-900/60 px-4 py-2 text-sm text-slate-600">
              <Flag size={16} className="text-primary-600" />
              {t.stepLabel(stepIndex, totalSteps)}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-600">
              <span className="uppercase tracking-wide text-slate-500">{t.languageLabel}</span>
              <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => updateSettings('general', { language: 'pl' })}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-semibold transition',
                    language === 'pl'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  PL
                </button>
                <button
                  type="button"
                  onClick={() => updateSettings('general', { language: 'en' })}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-semibold transition',
                    language === 'en'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => updateSettings('general', { language: 'uk' })}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-semibold transition',
                    language === 'uk'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  UA
                </button>
              </div>
            </div>
          </div>
        </header>

        {step === 'pair' && (
          <section className="space-y-6">
            <div className="rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-white/50 shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                    {t.choosePair}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t.choosePairDesc}
                  </p>
                </div>
                <Sparkles className="text-primary-600" size={20} />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {LEARNING_PAIRS.map((pair) => {
                  const isSelected = pair.id === settings.learning.pairId;
                  const label = pair.label[language] ?? pair.label.pl;
                  const uiLabel = getLanguageLabel(pair.uiLanguage, language);
                  const aiLabel = getLanguageLabel(pair.feedbackLanguage, language);

                  return (
                    <button
                      key={pair.id}
                      onClick={() => setLearningPair(pair.id)}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition-all',
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/40 shadow-lg'
                          : 'border-slate-200 dark:border-slate-700 hover:border-primary-300'
                      )}
                    >
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {label}
                      </div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        UI: {uiLabel} • AI: {aiLabel}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-slate-500">{t.choosePairHint}</p>
            </div>

            <div className="flex justify-end">
              <Button size="lg" onClick={() => setStep('skin')}>
                {t.choosePairAction}
              </Button>
            </div>
          </section>
        )}

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
                    <span className="font-medium">
                      {t.formatHint(`${examplePair.target} - ${examplePair.native}`)}
                    </span>
                    .
                  </p>
                </div>
                <Sparkles className="text-primary-600" size={20} />
              </div>

              <WordIntake
                variant="onboarding"
                minWords={MISSION_WORDS}
                onWordsAdded={handleWordsAdded}
              />
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

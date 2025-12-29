'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Flag, Sparkles, Target } from 'lucide-react';
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
import { getPersonaForPair } from '@/lib/persona';

const MISSION_WORDS = 3;

type Step = 'path' | 'pair' | 'goal' | 'skin' | 'words' | 'mission' | 'done';
type OnboardingGoal = 'classTest' | 'daily';
type OnboardingPath = 'pl_student' | 'ua_student' | 'custom';

const detectPreferredLanguage = (): AppLanguage => {
  if (typeof navigator === 'undefined') return 'pl';
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  if (languages.some((lang) => lang.toLowerCase().startsWith('uk'))) return 'uk';
  if (languages.some((lang) => lang.toLowerCase().startsWith('ru'))) return 'uk';
  if (languages.some((lang) => lang.toLowerCase().startsWith('pl'))) return 'pl';
  if (languages.some((lang) => lang.toLowerCase().startsWith('en'))) return 'en';
  return 'pl';
};

const onboardingCopy = {
  pl: {
    loading: 'Ładowanie...',
    onboardingLabel: 'Onboarding',
    signOut: 'Wyloguj się',
    skip: 'Pomiń',
    title: 'Start nauki',
    choosePath: 'Wybierz ścieżkę ucznia',
    choosePathDesc: 'Dopasujemy język i tempo nauki.',
    pathPolishStudent: 'Uczeń w Polsce (PL → EN)',
    pathPolishStudentDesc: 'Klasówki, słówka z lekcji i szybkie quizy.',
    pathUkrainianStudent: 'Uczeń z Ukrainy w Polsce (UA → PL)',
    pathUkrainianStudentDesc: 'Polski do szkoły i codziennych sytuacji.',
    choosePathAction: 'Dalej',
    pathHint: 'Możesz zmienić później w profilu.',
    polishHintTitle: 'Polskie znaki',
    polishHintBody:
      'Zwróć uwagę na litery: ą, ę, ł, ó, ś, ć, ń, ż, ź. Wpisuj je dokładnie — to inne słowa.',
    languageLabel: 'Język',
    stepLabel: (current: number, total: number) => `Krok ${current} z ${total}`,
    choosePair: 'Wybierz parę językową',
    choosePairDesc: 'To ustawia język interfejsu, AI oraz kierunek nauki.',
    choosePairHint: 'Możesz zmienić później w profilu.',
    choosePairAction: 'Dalej',
    chooseGoal: 'Wybierz cel nauki',
    chooseGoalDesc: 'Dopasujemy tempo sesji i liczbę pytań.',
    goalClassTest: 'Szybka klasówka',
    goalClassTestDesc: 'Krótki quiz i szybkie powtórki przed sprawdzianem.',
    goalDaily: 'Regularna nauka',
    goalDailyDesc: 'Spokojniejsze tempo i równy rytm powtórek.',
    goalHint: 'Możesz zmienić później w ustawieniach sesji.',
    chooseGoalAction: 'Dalej',
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
    signOut: 'Sign out',
    skip: 'Skip',
    title: 'Start learning',
    choosePath: 'Choose your school track',
    choosePathDesc: 'We will tailor language and learning pace.',
    pathPolishStudent: 'Student in Poland (PL → EN)',
    pathPolishStudentDesc: 'Tests, lesson vocabulary, and quick quizzes.',
    pathUkrainianStudent: 'Ukrainian student in Poland (UA → PL)',
    pathUkrainianStudentDesc: 'Polish for school and everyday life.',
    choosePathAction: 'Continue',
    pathHint: 'You can change it later in profile.',
    polishHintTitle: 'Polish letters',
    polishHintBody:
      'Watch for: ą, ę, ł, ó, ś, ć, ń, ż, ź. Type them exactly — they change meaning.',
    languageLabel: 'Language',
    stepLabel: (current: number, total: number) => `Step ${current} of ${total}`,
    choosePair: 'Choose your learning pair',
    choosePairDesc: 'This sets the interface language, AI feedback, and learning direction.',
    choosePairHint: 'You can change it later in profile.',
    choosePairAction: 'Continue',
    chooseGoal: 'Pick a learning goal',
    chooseGoalDesc: 'We will tune the session pace and question count.',
    goalClassTest: 'Quick test prep',
    goalClassTestDesc: 'Short quiz and fast review before a test.',
    goalDaily: 'Regular learning',
    goalDailyDesc: 'Steady pace and balanced review.',
    goalHint: 'You can change it later in session settings.',
    chooseGoalAction: 'Continue',
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
    signOut: 'Вийти',
    skip: 'Пропустити',
    title: 'Старт навчання',
    choosePath: 'Обери навчальний шлях',
    choosePathDesc: 'Підлаштуємо мову та темп навчання.',
    pathPolishStudent: 'Учень у Польщі (PL → EN)',
    pathPolishStudentDesc: 'Контрольні, слова з уроків і швидкі квізи.',
    pathUkrainianStudent: 'Учень з України в Польщі (UA → PL)',
    pathUkrainianStudentDesc: 'Польська для школи й повсякденних ситуацій.',
    choosePathAction: 'Далі',
    pathHint: 'Зможеш змінити пізніше в профілі.',
    polishHintTitle: 'Польські літери',
    polishHintBody:
      'Зверни увагу на: ą, ę, ł, ó, ś, ć, ń, ż, ź. Пиши їх точно — це інші слова.',
    languageLabel: 'Мова',
    stepLabel: (current: number, total: number) => `Крок ${current} з ${total}`,
    choosePair: 'Обери мовну пару',
    choosePairDesc: 'Це задає мову інтерфейсу, фідбек AI та напрям навчання.',
    choosePairHint: 'Можеш змінити пізніше в профілі.',
    choosePairAction: 'Далі',
    chooseGoal: 'Обери ціль навчання',
    chooseGoalDesc: 'Налаштуємо темп сесій і кількість запитань.',
    goalClassTest: 'Швидка контрольна',
    goalClassTestDesc: 'Короткий квіз і швидкі повторення перед тестом.',
    goalDaily: 'Регулярне навчання',
    goalDailyDesc: 'Спокійний темп і рівні повторення.',
    goalHint: 'Зможеш змінити пізніше в налаштуваннях сесій.',
    chooseGoalAction: 'Далі',
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

interface OnboardingFooterProps {
  children: React.ReactNode;
}

function OnboardingFooter({ children }: OnboardingFooterProps) {
  return (
    <>
      {/* Mobile fixed footer */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-50">
        <div className="flex flex-wrap gap-3 max-w-4xl mx-auto">
          {children}
        </div>
      </div>
      {/* Desktop inline buttons */}
      <div className="hidden md:flex justify-end gap-3">
        {children}
      </div>
    </>
  );
}

export default function OnboardingPage() {
  const hydrated = useHydration();
  const router = useRouter();
  const { data: session, update } = useSession();
  const language = useLanguage();
  const t = (onboardingCopy[language] ?? onboardingCopy.pl) as OnboardingCopy;
  const [step, setStep] = useState<Step>('path');
  const [selectedSkin, setSelectedSkin] = useState(session?.user?.mascotSkin || 'explorer');
  const [onboardingSetId, setOnboardingSetId] = useState<string | null>(null);
  const [onboardingSetName, setOnboardingSetName] = useState('');
  const [goal, setGoal] = useState<OnboardingGoal>('classTest');
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

  const steps: Step[] = ['path', 'pair', 'goal', 'skin', 'words', 'mission', 'done'];
  const stepIndex = steps.indexOf(step) + 1;
  const totalSteps = steps.length;

  const persona = getPersonaForPair(settings.learning.pairId);
  const selectedPath: OnboardingPath =
    persona === 'pl_student'
      ? 'pl_student'
      : persona === 'ua_student'
        ? 'ua_student'
        : 'custom';
  const showPolishHint = activePair.target === 'pl' && language === 'uk';

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
      setLearningPair('uk-pl');
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

  const applyGoalSettings = (selectedGoal: OnboardingGoal) => {
    if (selectedGoal === 'classTest') {
      updateSettings('session', {
        quizQuestionCount: 5,
        flashcardCount: 5,
        timeLimit: 10,
      });
      return;
    }

    updateSettings('session', {
      quizQuestionCount: 10,
      flashcardCount: 10,
      timeLimit: null,
    });
  };

  const goalOptions: Array<{
    id: OnboardingGoal;
    label: string;
    description: string;
  }> = [
    {
      id: 'classTest',
      label: t.goalClassTest,
      description: t.goalClassTestDesc,
    },
    {
      id: 'daily',
      label: t.goalDaily,
      description: t.goalDailyDesc,
    },
  ];

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

  const skipOnboarding = async () => {
    await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboardingComplete: true }),
    });

    await update({ onboardingComplete: true });
    router.push('/');
  };

  return (
    <div className="min-h-screen px-4 py-10 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-10">
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              {t.signOut}
            </Button>
          </div>
        </header>

        {step === 'path' && (
          <section className="space-y-6">
            <div className="rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-white/50 shadow-xl p-6 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                    {t.choosePath}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t.choosePathDesc}
                  </p>
                </div>
                <Flag className="text-primary-600" size={20} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {[
                  {
                    id: 'pl_student',
                    title: t.pathPolishStudent,
                    description: t.pathPolishStudentDesc,
                    pairId: 'pl-en',
                  },
                  {
                    id: 'ua_student',
                    title: t.pathUkrainianStudent,
                    description: t.pathUkrainianStudentDesc,
                    pairId: 'uk-pl',
                  },
                ].map((option) => {
                  const isSelected = selectedPath === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setLearningPair(option.pairId)}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition-all',
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/40 shadow-lg'
                          : 'border-slate-200 dark:border-slate-700 hover:border-primary-300'
                      )}
                    >
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {option.title}
                      </div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {option.description}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-slate-500">{t.pathHint}</p>
            </div>

            <OnboardingFooter>
              <Button variant="ghost" onClick={skipOnboarding} className="md:flex-initial flex-1">
                {t.skip}
              </Button>
              <Button size="lg" onClick={() => setStep('pair')} className="md:flex-initial flex-1">
                {t.choosePathAction}
              </Button>
            </OnboardingFooter>
          </section>
        )}

        {step === 'pair' && (
          <section className="space-y-6">
            <div className="rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-white/50 shadow-xl p-6 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

            <OnboardingFooter>
              <Button variant="ghost" onClick={skipOnboarding} className="md:flex-initial flex-1">
                {t.skip}
              </Button>
              <Button size="lg" onClick={() => setStep('goal')} className="md:flex-initial flex-1">
                {t.choosePairAction}
              </Button>
            </OnboardingFooter>
          </section>
        )}

        {step === 'goal' && (
          <section className="space-y-6">
            <div className="rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-white/50 shadow-xl p-6 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                    {t.chooseGoal}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t.chooseGoalDesc}
                  </p>
                </div>
                <Target className="text-primary-600" size={20} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {goalOptions.map((option) => {
                  const isSelected = option.id === goal;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setGoal(option.id)}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition-all',
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/40 shadow-lg'
                          : 'border-slate-200 dark:border-slate-700 hover:border-primary-300'
                      )}
                    >
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {option.label}
                      </div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {option.description}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-slate-500">{t.goalHint}</p>
            </div>

            <OnboardingFooter>
              <Button variant="ghost" onClick={skipOnboarding} className="md:flex-initial flex-1">
                {t.skip}
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  applyGoalSettings(goal);
                  setStep('skin');
                }}
                className="md:flex-initial flex-1"
              >
                {t.chooseGoalAction}
              </Button>
            </OnboardingFooter>
          </section>
        )}

        {step === 'skin' && (
          <section className="space-y-6">
            <div className="rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-white/50 shadow-xl p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

            <OnboardingFooter>
              <Button variant="ghost" onClick={skipOnboarding} className="md:flex-initial flex-1">
                {t.skip}
              </Button>
              <Button
                size="lg"
                onClick={async () => {
                  await saveSkin();
                  setStep('words');
                }}
                className="md:flex-initial flex-1"
              >
                {t.startMission}
              </Button>
            </OnboardingFooter>
          </section>
        )}

        {step === 'words' && (
          <section className="space-y-4 sm:space-y-6">
            <div className="rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-white/50 shadow-xl p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

              {showPolishHint && (
                <div className="rounded-2xl border border-sky-100 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-900/30 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  <p className="font-semibold text-slate-700 dark:text-slate-100">
                    {t.polishHintTitle}
                  </p>
                  <p className="mt-1">{t.polishHintBody}</p>
                </div>
              )}

              <WordIntake
                variant="onboarding"
                minWords={MISSION_WORDS}
                onWordsAdded={handleWordsAdded}
                className="pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0"
                compact
                renderActions={(buttons) => (
                  <OnboardingFooter>
                    <Button
                      variant="ghost"
                      onClick={skipOnboarding}
                      className="md:flex-initial flex-1 min-w-[140px]"
                    >
                      {t.skip}
                    </Button>
                    {buttons}
                  </OnboardingFooter>
                )}
              />
            </div>

          </section>
        )}

        {step === 'mission' && (
          <section className="space-y-6">
            <div className="rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-white/50 shadow-xl p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

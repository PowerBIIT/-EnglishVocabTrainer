'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Compass,
  Flame,
  Folder,
  LogOut,
  Palette,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trash2,
  Trophy,
  UserCircle,
  Volume2,
  Wand2,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CircularProgress, ProgressBar } from '@/components/ui/ProgressBar';
import { PricingSection } from '@/components/billing/PricingSection';
import { UsageDisplay } from '@/components/billing/UsageDisplay';
import { useHydration, useVocabStore } from '@/lib/store';
import { useLanguage } from '@/lib/i18n';
import { mascotSkins } from '@/data/mascotSkins';
import { MascotSkinCard } from '@/components/mascot/MascotSkinCard';
import { BADGES, cn, getLevelProgress } from '@/lib/utils';
import { getMissionCopy } from '@/lib/missions';
import { getLanguageLabel, getLearningPair, LEARNING_PAIRS } from '@/lib/languages';

const badgeIcons = {
  flame: Flame,
  sparkles: Sparkles,
  target: Target,
  mic: Volume2,
  'book-open': BookOpen,
  trophy: Trophy,
};

interface SelectProps {
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (value: string | number) => void;
}

function Select({ value, options, onChange }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => {
        const val = e.target.value;
        const numVal = Number(val);
        onChange(isNaN(numVal) ? val : numVal);
      }}
      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-12 h-6 rounded-full transition-colors',
        checked ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'
      )}
    >
      <div
        className={cn(
          'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
          checked ? 'translate-x-7' : 'translate-x-1'
        )}
      />
    </button>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <p className="font-medium text-slate-800 dark:text-slate-100">{label}</p>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      <div className="flex w-full justify-start sm:w-auto sm:justify-end">
        {children}
      </div>
    </div>
  );
}

const missionRoutes = {
  pl: {
    flashcards: { href: '/flashcards', label: 'Fiszki' },
    quiz: { href: '/quiz', label: 'Quiz' },
    pronunciation: { href: '/pronunciation', label: 'Wymowa' },
    mixed: { href: '/flashcards', label: 'Tryb mieszany' },
  },
  en: {
    flashcards: { href: '/flashcards', label: 'Flashcards' },
    quiz: { href: '/quiz', label: 'Quiz' },
    pronunciation: { href: '/pronunciation', label: 'Pronunciation' },
    mixed: { href: '/flashcards', label: 'Mixed mode' },
  },
  uk: {
    flashcards: { href: '/flashcards', label: 'Флешкарти' },
    quiz: { href: '/quiz', label: 'Квіз' },
    pronunciation: { href: '/pronunciation', label: 'Вимова' },
    mixed: { href: '/flashcards', label: 'Змішаний режим' },
  },
} as const;

const profileCopy = {
  pl: {
    loading: 'Ładowanie...',
    profileLabel: 'Profil',
    userFallback: 'Użytkownik',
    emailFallback: 'Brak e-maila',
    logout: 'Wyloguj',
    dailyMission: 'Zadanie dnia',
    missionStart: 'Start zadania',
    missionContinue: 'Kontynuuj zadanie',
    keepStreak: (days: number) => `Utrzymaj serię: ${days} dni`,
    levelTitle: 'Twój poziom',
    levelLabel: (level: number) => `Poziom ${level}`,
    progressToNext: 'Postęp do następnego poziomu',
    masteredWords: 'Opanowane słówka',
    all: 'Wszystkie',
    allWords: 'Wszystkie słówka',
    collection: 'Kolekcja',
    collectionDesc: 'Twoje odznaki i skiny rozwijają się razem z postępem.',
    badges: 'Odznaki',
    badgesEmpty: 'Pierwsze odznaki pojawią się po ukończeniu misji.',
    skins: 'Wersje Henia',
    setsTitle: 'Zestawy słówek',
    newSetPlaceholder: 'Nowy zestaw (np. Klasówka z biologii)',
    addSet: 'Dodaj zestaw',
    noSets: 'Brak zestawów. Dodaj pierwszy, aby szybciej wybierać słówka do testów.',
    wordsCount: (count: number) => `${count} słówek`,
    save: 'Zapisz',
    cancel: 'Anuluj',
    edit: 'Edytuj',
    delete: 'Usuń',
    unassigned: (count: number) => `Bez zestawu: ${count} słówek`,
    settingsTitle: 'Ustawienia',
    settingsDesc: 'Zmiany zapisują się automatycznie, ale możesz też wymusić zapis.',
    saving: 'Zapisywanie...',
    saved: 'Zapisano',
    saveError: 'Błąd zapisu',
    learningProfile: 'Profil nauki',
    learningProfileDesc:
      'Wybierz parę językową. Zmiana ustawia język interfejsu oraz feedbacku AI.',
    learningProfileHint:
      'Zmiana profilu nie usuwa danych, tylko filtruje zestawy i słówka.',
    sessionSettings: 'Ustawienia sesji',
    quizQuestions: 'Pytań w quizie',
    flashcardsPerSession: 'Fiszek w sesji',
    timeLimit: 'Limit czasu',
    timeLimitDesc: 'Na odpowiedź w quizie',
    none: 'Brak',
    seconds: (value: number) => `${value} sekund`,
    wordOrder: 'Kolejność słówek',
    wordOrderRandom: 'Losowa',
    wordOrderAlphabetical: 'Alfabetyczna',
    wordOrderHardest: 'Najtrudniejsze',
    repeatMistakes: 'Powtórki błędnych',
    repeatMistakesDesc: 'Powtarzaj błędne odpowiedzi',
    pronunciationSettings: 'Ustawienia wymowy',
    voice: 'Głos',
    voiceBritish: 'Brytyjski',
    voiceAmerican: 'Amerykański',
    voiceAustralian: 'Australijski',
    voiceAuto: 'Automatyczny (język docelowy)',
    voiceAutoDesc: 'Dla języków innych niż angielski głos jest dobierany automatycznie.',
    speechSpeed: 'Prędkość mowy',
    speedSlow: 'Wolna',
    speedNormal: 'Normalna',
    speedFast: 'Szybka',
    autoPlay: 'Auto-odtwarzanie',
    autoPlayDesc: 'Automatycznie odtwarzaj wymowę',
    passingScore: 'Próg zaliczenia',
    passingScoreDesc: 'Minimalna ocena wymowy',
    adaptiveDifficulty: 'Adaptacyjna trudność',
    adaptiveDifficultyDesc: 'Dostosuj trudność do poziomu',
    phonemeHints: 'Wskazówki fonemowe',
    phonemeHintsDesc: 'Pokaż porady o pozycji ust',
    appearanceSound: 'Wygląd i dźwięk',
    languageLabel: 'Język interfejsu',
    languagePreview: 'Etykiety: Start, Słówka, Wymowa, Czat, Profil.',
    theme: 'Motyw',
    themeLight: 'Jasny',
    themeDark: 'Ciemny',
    themeAuto: 'Automatyczny',
    sounds: 'Dźwięki',
    soundsDesc: 'Efekty dźwiękowe w aplikacji',
    aiAssistant: 'Asystent AI',
    aiFeedbackDetail: 'Szczegółowość feedbacku',
    aiFeedbackShort: 'Krótki',
    aiFeedbackDetailed: 'Szczegółowy',
    aiFeedbackLanguage: 'Język feedbacku AI',
    languagePolish: 'Polski',
    languageEnglish: 'English',
    languageGerman: 'Niemiecki',
    languageUkrainian: 'Ukraiński',
    aiPhoneticHints: 'Wskazówki fonetyczne',
    aiPhoneticHintsDesc: 'Pokazuj porady dotyczące wymowy',
    account: 'Konto',
    signedInAs: 'Zalogowany jako',
    restartOnboarding: 'Powtórz onboarding',
    restartOnboardingDesc:
      'Przejdziesz ponownie przez wybór pary językowej, skina i pierwszej misji. Dane pozostaną bez zmian.',
    restartOnboardingAction: 'Uruchom ponownie',
    restartOnboardingConfirm:
      'Na pewno chcesz ponownie uruchomić onboarding? Dane nie zostaną usunięte.',
    exportData: 'Eksportuj dane',
    exportDataDesc: 'Pobierz wszystkie swoje dane w formacie JSON.',
    exportDataAction: 'Pobierz dane',
    exportingData: 'Eksportowanie...',
    deleteAccount: 'Usun konto',
    deleteAccountDesc: 'Trwale usun wszystkie dane. Tej operacji nie mozna cofnac.',
    deleteAccountAction: 'Usun konto',
    deleteAccountConfirm: 'Na pewno chcesz usunac swoje konto?',
    deleteAccountWarning:
      'Wszystkie Twoje dane, w tym slowka, postepy i ustawienia zostana trwale usuniete. Tej operacji nie mozna cofnac.',
    deleteAccountConfirmAction: 'Tak, usun moje konto',
    deleteAccountCancel: 'Anuluj',
    deletingAccount: 'Usuwanie...',
    deleteSetConfirm: (name: string) =>
      `Usunąć zestaw "${name}"? Słówka pozostaną w bibliotece bez przypisanego zestawu.`,
  },
  en: {
    loading: 'Loading...',
    profileLabel: 'Profile',
    userFallback: 'User',
    emailFallback: 'No email',
    logout: 'Log out',
    dailyMission: 'Task of the day',
    missionStart: 'Start task',
    missionContinue: 'Continue task',
    keepStreak: (days: number) => `Keep your streak: ${days} days`,
    levelTitle: 'Your level',
    levelLabel: (level: number) => `Level ${level}`,
    progressToNext: 'Progress to next level',
    masteredWords: 'Mastered words',
    all: 'All',
    allWords: 'All words',
    collection: 'Collection',
    collectionDesc: 'Your badges and skins grow with your progress.',
    badges: 'Badges',
    badgesEmpty: 'First badges will appear after you complete a mission.',
    skins: "Henio's styles",
    setsTitle: 'Word sets',
    newSetPlaceholder: 'New set (e.g. Biology test)',
    addSet: 'Add set',
    noSets: 'No sets yet. Add one to quickly pick words for tests.',
    wordsCount: (count: number) => `${count} words`,
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    unassigned: (count: number) => `Unassigned: ${count} words`,
    settingsTitle: 'Settings',
    settingsDesc: 'Changes are saved automatically, but you can also force a save.',
    saving: 'Saving...',
    saved: 'Saved',
    saveError: 'Save failed',
    learningProfile: 'Learning profile',
    learningProfileDesc:
      'Choose your language pair. This sets the interface language and AI feedback.',
    learningProfileHint:
      'Changing the profile does not delete data; it filters sets and words.',
    sessionSettings: 'Session settings',
    quizQuestions: 'Quiz questions',
    flashcardsPerSession: 'Flashcards per session',
    timeLimit: 'Time limit',
    timeLimitDesc: 'Per quiz answer',
    none: 'None',
    seconds: (value: number) => `${value} seconds`,
    wordOrder: 'Word order',
    wordOrderRandom: 'Random',
    wordOrderAlphabetical: 'Alphabetical',
    wordOrderHardest: 'Hardest first',
    repeatMistakes: 'Repeat mistakes',
    repeatMistakesDesc: 'Repeat wrong answers',
    pronunciationSettings: 'Pronunciation settings',
    voice: 'Voice',
    voiceBritish: 'British',
    voiceAmerican: 'American',
    voiceAustralian: 'Australian',
    voiceAuto: 'Automatic (target language)',
    voiceAutoDesc: 'For non-English targets, the voice is selected automatically.',
    speechSpeed: 'Speech speed',
    speedSlow: 'Slow',
    speedNormal: 'Normal',
    speedFast: 'Fast',
    autoPlay: 'Auto-play',
    autoPlayDesc: 'Automatically play pronunciation',
    passingScore: 'Passing score',
    passingScoreDesc: 'Minimum pronunciation score',
    adaptiveDifficulty: 'Adaptive difficulty',
    adaptiveDifficultyDesc: 'Adjust difficulty to level',
    phonemeHints: 'Phoneme hints',
    phonemeHintsDesc: 'Show mouth position tips',
    appearanceSound: 'Appearance & sound',
    languageLabel: 'Interface language',
    languagePreview: 'Navigation: Home, Vocabulary, Pronunciation, Chat, Profile.',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeAuto: 'Auto',
    sounds: 'Sounds',
    soundsDesc: 'Sound effects in the app',
    aiAssistant: 'AI assistant',
    aiFeedbackDetail: 'Feedback detail',
    aiFeedbackShort: 'Short',
    aiFeedbackDetailed: 'Detailed',
    aiFeedbackLanguage: 'AI feedback language',
    languagePolish: 'Polish',
    languageEnglish: 'English',
    languageGerman: 'German',
    languageUkrainian: 'Ukrainian',
    aiPhoneticHints: 'Phonetic hints',
    aiPhoneticHintsDesc: 'Show pronunciation tips',
    account: 'Account',
    signedInAs: 'Signed in as',
    restartOnboarding: 'Restart onboarding',
    restartOnboardingDesc:
      'Go through the language pair, mascot, and first mission again. Your data will stay intact.',
    restartOnboardingAction: 'Restart',
    restartOnboardingConfirm: 'Restart onboarding now? Your data will not be deleted.',
    exportData: 'Export data',
    exportDataDesc: 'Download all your data in JSON format.',
    exportDataAction: 'Download data',
    exportingData: 'Exporting...',
    deleteAccount: 'Delete account',
    deleteAccountDesc: 'Permanently delete all data. This cannot be undone.',
    deleteAccountAction: 'Delete account',
    deleteAccountConfirm: 'Are you sure you want to delete your account?',
    deleteAccountWarning:
      'All your data, including vocabulary, progress, and settings will be permanently deleted. This cannot be undone.',
    deleteAccountConfirmAction: 'Yes, delete my account',
    deleteAccountCancel: 'Cancel',
    deletingAccount: 'Deleting...',
    deleteSetConfirm: (name: string) =>
      `Delete set "${name}"? Words will stay in the library without a set.`,
  },
  uk: {
    loading: 'Завантаження...',
    profileLabel: 'Профіль',
    userFallback: 'Користувач',
    emailFallback: 'Немає e-mail',
    logout: 'Вийти',
    dailyMission: 'Завдання дня',
    missionStart: 'Почати завдання',
    missionContinue: 'Продовжити завдання',
    keepStreak: (days: number) => `Утримай серію: ${days} днів`,
    levelTitle: 'Твій рівень',
    levelLabel: (level: number) => `Рівень ${level}`,
    progressToNext: 'Прогрес до наступного рівня',
    masteredWords: 'Вивчені слова',
    all: 'Усі',
    allWords: 'Усі слова',
    collection: 'Колекція',
    collectionDesc: 'Твої відзнаки та скіни зростають разом із прогресом.',
    badges: 'Відзнаки',
    badgesEmpty: "Перші відзнаки з'являться після виконання місії.",
    skins: 'Версії Геньо',
    setsTitle: 'Набори слів',
    newSetPlaceholder: 'Новий набір (напр. Контрольна з біології)',
    addSet: 'Додати набір',
    noSets: 'Немає наборів. Додай перший, щоб швидше обирати слова для тестів.',
    wordsCount: (count: number) => `${count} слів`,
    save: 'Зберегти',
    cancel: 'Скасувати',
    edit: 'Редагувати',
    delete: 'Видалити',
    unassigned: (count: number) => `Без набору: ${count} слів`,
    settingsTitle: 'Налаштування',
    settingsDesc: 'Зміни зберігаються автоматично, але можна також примусово зберегти.',
    saving: 'Збереження...',
    saved: 'Збережено',
    saveError: 'Помилка збереження',
    learningProfile: 'Профіль навчання',
    learningProfileDesc:
      'Обери мовну пару. Це встановлює мову інтерфейсу та фідбек AI.',
    learningProfileHint:
      'Зміна профілю не видаляє дані, лише фільтрує набори й слова.',
    sessionSettings: 'Налаштування сесії',
    quizQuestions: 'Питань у квізі',
    flashcardsPerSession: 'Флешкарт у сесії',
    timeLimit: 'Ліміт часу',
    timeLimitDesc: 'На відповідь у квізі',
    none: 'Немає',
    seconds: (value: number) => `${value} секунд`,
    wordOrder: 'Порядок слів',
    wordOrderRandom: 'Випадковий',
    wordOrderAlphabetical: 'Алфавітний',
    wordOrderHardest: 'Найскладніші',
    repeatMistakes: 'Повторювати помилки',
    repeatMistakesDesc: 'Повторюй неправильні відповіді',
    pronunciationSettings: 'Налаштування вимови',
    voice: 'Голос',
    voiceBritish: 'Британський',
    voiceAmerican: 'Американський',
    voiceAustralian: 'Австралійський',
    voiceAuto: 'Автоматично (цільова мова)',
    voiceAutoDesc: 'Для неанглійської цілі голос підбирається автоматично.',
    speechSpeed: 'Швидкість мовлення',
    speedSlow: 'Повільна',
    speedNormal: 'Нормальна',
    speedFast: 'Швидка',
    autoPlay: 'Автовідтворення',
    autoPlayDesc: 'Автоматично відтворювати вимову',
    passingScore: 'Прохідний бал',
    passingScoreDesc: 'Мінімальна оцінка вимови',
    adaptiveDifficulty: 'Адаптивна складність',
    adaptiveDifficultyDesc: 'Підлаштовує складність під рівень',
    phonemeHints: 'Підказки фонемів',
    phonemeHintsDesc: 'Показувати поради щодо позиції рота',
    appearanceSound: 'Вигляд і звук',
    languageLabel: 'Мова інтерфейсу',
    languagePreview: 'Навігація: Старт, Слова, Вимова, Чат, Профіль.',
    theme: 'Тема',
    themeLight: 'Світла',
    themeDark: 'Темна',
    themeAuto: 'Авто',
    sounds: 'Звуки',
    soundsDesc: 'Звукові ефекти в застосунку',
    aiAssistant: 'AI асистент',
    aiFeedbackDetail: 'Детальність фідбеку',
    aiFeedbackShort: 'Короткий',
    aiFeedbackDetailed: 'Детальний',
    aiFeedbackLanguage: 'Мова фідбеку AI',
    languagePolish: 'Польська',
    languageEnglish: 'Англійська',
    languageGerman: 'Німецька',
    languageUkrainian: 'Українська',
    aiPhoneticHints: 'Фонетичні підказки',
    aiPhoneticHintsDesc: 'Показувати поради з вимови',
    account: 'Обліковий запис',
    signedInAs: 'Увійшов як',
    restartOnboarding: 'Повторити онбординг',
    restartOnboardingDesc:
      'Пройди вибір мовної пари, скіна та першої місії ще раз. Дані залишаться.',
    restartOnboardingAction: 'Повторити',
    restartOnboardingConfirm: 'Повторити онбординг? Дані не буде видалено.',
    exportData: 'Eksportuvaty dani',
    exportDataDesc: 'Zavantazhyty vsi svoi dani u formati JSON.',
    exportDataAction: 'Zavantazhyty dani',
    exportingData: 'Eksportuvannya...',
    deleteAccount: 'Vydalyty akaunt',
    deleteAccountDesc: 'Nazavzhdy vydalyty vsi dani. Tsoho ne mozhna skasuvaty.',
    deleteAccountAction: 'Vydalyty akaunt',
    deleteAccountConfirm: 'Vy vpevneni, shcho hochete vydalyty sviy akaunt?',
    deleteAccountWarning:
      'Vsi vashi dani, vklyuchayuchy slovnyk, prohres ta nalashtuvannya budut nazavzhdy vydaleni. Tsoho ne mozhna skasuvaty.',
    deleteAccountConfirmAction: 'Tak, vydalyty miy akaunt',
    deleteAccountCancel: 'Skasuvaty',
    deletingAccount: 'Vydalennya...',
    deleteSetConfirm: (name: string) =>
      `Видалити набір "${name}"? Слова залишаться в бібліотеці без набору.`,
  },
} as const;

type ProfileCopy = typeof profileCopy.pl;

const AUTO_SAVE_DEBOUNCE_MS = 900;
const AUTO_SAVE_IDLE_DELAY_MS = 2200;

export default function ProfilePage() {
  const hydrated = useHydration();
  const router = useRouter();
  const { data: session, update } = useSession();
  const language = useLanguage();
  const t = (profileCopy[language] ?? profileCopy.pl) as ProfileCopy;
  const [selectedSkin, setSelectedSkin] = useState('explorer');
  const [isRestartingOnboarding, setIsRestartingOnboarding] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isExportingData, setIsExportingData] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<{
    plan: 'FREE' | 'PRO';
    status?: string | null;
    cancelAtPeriodEnd?: boolean;
    usage?: { used: number; limit: number; resetDate: string };
  } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMountedRef = useRef(false);
  const isManualSaveRef = useRef(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const settings = useVocabStore((state) => state.settings);
  const updateSettings = useVocabStore((state) => state.updateSettings);
  const stats = useVocabStore((state) => state.stats);
  const vocabulary = useVocabStore((state) => state.getActiveVocabulary());
  const sets = useVocabStore((state) => state.getActiveSets());
  const createSet = useVocabStore((state) => state.createSet);
  const renameSet = useVocabStore((state) => state.renameSet);
  const deleteSet = useVocabStore((state) => state.deleteSet);
  const progress = useVocabStore((state) => state.progress);
  const dailyMission = useVocabStore((state) => state.dailyMission);
  const setLearningPair = useVocabStore((state) => state.setLearningPair);
  const [newSetName, setNewSetName] = useState('');
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editingSetName, setEditingSetName] = useState('');

  useEffect(() => {
    if (session?.user?.mascotSkin) {
      setSelectedSkin(session.user.mascotSkin);
    }
  }, [session?.user?.mascotSkin]);

  useEffect(() => {
    fetch('/api/user/subscription')
      .then((res) => res.json())
      .then(setSubscriptionData)
      .catch(console.error);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (isManualSaveRef.current) {
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveState('saving');
    autoSaveTimeoutRef.current = setTimeout(() => {
      setSaveState('saved');
      autoSaveTimeoutRef.current = setTimeout(() => {
        setSaveState('idle');
      }, AUTO_SAVE_IDLE_DELAY_MS);
    }, AUTO_SAVE_DEBOUNCE_MS);
  }, [settings]);

  const handleUpgrade = async (priceType: 'monthly' | 'annual') => {
    const res = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceType }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const handleManageSubscription = async () => {
    const res = await fetch('/api/stripe/create-portal-session', {
      method: 'POST',
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const handleSkinSelect = async (skinId: string) => {
    setSelectedSkin(skinId);
    await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mascotSkin: skinId }),
    });
    await update({ mascotSkin: skinId });
  };

  const handleSaveSettings = async () => {
    isManualSaveRef.current = true;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    setSaveState('saving');
    const state = useVocabStore.getState();
    const payload = {
      vocabulary: state.vocabulary,
      sets: state.sets,
      progress: state.progress,
      settings: state.settings,
      stats: state.stats,
      dailyMission: state.dailyMission,
    };

    try {
      const response = await fetch('/api/user/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      });
      if (!response.ok) {
        throw new Error('Save failed');
      }
      setSaveState('saved');
      saveTimeoutRef.current = setTimeout(() => setSaveState('idle'), 2000);
    } catch (error) {
      setSaveState('error');
      saveTimeoutRef.current = setTimeout(() => setSaveState('idle'), 3000);
    } finally {
      isManualSaveRef.current = false;
    }
  };

  const userName = session?.user?.name || t.userFallback;
  const userEmail = session?.user?.email || t.emailFallback;
  const userInitials = useMemo(() => {
    const parts = userName.split(' ').filter(Boolean);
    if (parts.length === 0) return 'EV';
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [userName]);

  const levelProgress = getLevelProgress(stats.totalXp);

  const badgePresets = BADGES as Record<
    string,
    {
      name: string;
      nameEn?: string;
      nameUk?: string;
      description: string;
      descriptionEn?: string;
      descriptionUk?: string;
    }
  >;

  const getBadgeName = (badge: { id: string; name: string }) => {
    const preset = badgePresets[badge.id];
    if (!preset) return badge.name;
    if (language === 'en') return preset.nameEn ?? preset.name;
    if (language === 'uk') return preset.nameUk ?? preset.name;
    return preset.name;
  };

  const getBadgeDescription = (badge: { id: string; description: string }) => {
    const preset = badgePresets[badge.id];
    if (!preset) return badge.description;
    if (language === 'en') return preset.descriptionEn ?? preset.description;
    if (language === 'uk') return preset.descriptionUk ?? preset.description;
    return preset.description;
  };
  const masteredCount = vocabulary.filter(
    (word) => progress[word.id]?.status === 'mastered'
  ).length;

  const missionProgress = Math.min(
    100,
    Math.round((dailyMission.progress / dailyMission.target) * 100)
  );

  const missionRoute =
    missionRoutes[language][dailyMission.type] ?? missionRoutes[language].flashcards;
  const missionCopy = getMissionCopy(language, dailyMission.type);
  const saveStatusLabel =
    saveState === 'saving'
      ? t.saving
      : saveState === 'saved'
      ? t.saved
      : saveState === 'error'
      ? t.saveError
      : '';
  const languagePreview = t.languagePreview;
  const activePair = getLearningPair(settings.learning.pairId);
  const isEnglishTarget = settings.learning.targetLanguage === 'en';

  const setCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sets.forEach((set) => {
      counts[set.id] = 0;
    });
    vocabulary.forEach((word) => {
      const ids = word.setIds ?? [];
      ids.forEach((id) => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    return counts;
  }, [sets, vocabulary]);

  const unassignedCount = useMemo(
    () => vocabulary.filter((word) => (word.setIds ?? []).length === 0).length,
    [vocabulary]
  );

  const handleCreateSet = () => {
    const trimmed = newSetName.trim();
    if (!trimmed) return;
    createSet(trimmed);
    setNewSetName('');
  };

  const handleStartRename = (setId: string, name: string) => {
    setEditingSetId(setId);
    setEditingSetName(name);
  };

  const handleCancelRename = () => {
    setEditingSetId(null);
    setEditingSetName('');
  };

  const handleSaveRename = () => {
    if (!editingSetId) return;
    renameSet(editingSetId, editingSetName);
    setEditingSetId(null);
    setEditingSetName('');
  };

  const handleDeleteSet = (setId: string, name: string) => {
    const confirmation = confirm(t.deleteSetConfirm(name));
    if (!confirmation) return;
    deleteSet(setId);
  };

  const handleRestartOnboarding = async () => {
    const confirmation = confirm(t.restartOnboardingConfirm);
    if (!confirmation) return;
    setIsRestartingOnboarding(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingComplete: false }),
      });

      if (!response.ok) {
        throw new Error('Failed to restart onboarding');
      }

      await update({ onboardingComplete: false });
      router.push('/onboarding');
    } catch (error) {
      console.error('Unable to restart onboarding.', error);
      setIsRestartingOnboarding(false);
    }
  };

  const handleExportData = async () => {
    setIsExportingData(true);
    try {
      const response = await fetch('/api/user/export');

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `henio-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export data:', error);
    } finally {
      setIsExportingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      signOut({ callbackUrl: '/login' });
    } catch (error) {
      console.error('Unable to delete account.', error);
      setIsDeletingAccount(false);
      setShowDeleteAccountModal(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden pb-28">
      {/* Gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-blue-500 to-pink-500 opacity-5 dark:opacity-10" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 left-0 w-80 h-80 bg-pink-500/15 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 px-4 py-8 space-y-6 max-w-5xl mx-auto">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-500 via-blue-500 to-pink-500 p-0.5 shadow-xl shadow-primary-500/30">
            <div className="h-full w-full rounded-[14px] overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center font-semibold text-lg text-primary-700">
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={userName}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">{userInitials}</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-500">{t.profileLabel}</p>
            <h1 className="font-display text-2xl bg-gradient-to-r from-primary-600 via-blue-500 to-pink-500 bg-clip-text text-transparent">
              {userName}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{userEmail}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => signOut({ callbackUrl: '/login' })} className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800">
          <LogOut size={18} className="mr-2" />
          {t.logout}
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <Card variant="glass" className="overflow-hidden">
          <CardContent className="p-4 sm:p-6 bg-gradient-to-br from-primary-600 via-blue-500 to-pink-500 text-white">
            <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-white/80">
                  <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                    <Compass size={12} />
                  </div>
                  {t.dailyMission}
                </div>
                <h2 className="mt-2 font-display text-xl sm:text-2xl">{missionCopy.title}</h2>
                <p className="text-xs sm:text-sm text-white/80 mt-2">{missionCopy.description}</p>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs">
                  <Sparkles size={14} />
                  +{dailyMission.rewardXp} XP
                </div>
                <p className="mt-2 sm:mt-3 text-sm font-semibold">
                  {dailyMission.progress}/{dailyMission.target}
                </p>
              </div>
            </div>
            <ProgressBar value={missionProgress} size="sm" className="mt-3 sm:mt-4" />
            <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-3">
              <Link href={missionRoute.href}>
                <Button variant="secondary" size="sm" className="sm:px-4 sm:py-2 sm:text-base bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-white/20">
                  {dailyMission.completed ? t.missionContinue : t.missionStart} •{' '}
                  {missionRoute.label}
                </Button>
              </Link>
              <span className="text-xs text-white/80 flex items-center gap-1">
                <Flame size={12} />
                {t.keepStreak(stats.currentStreak)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">{t.levelTitle}</p>
                <p className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">
                  {t.levelLabel(levelProgress.level)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Star size={14} className="text-white" />
                </div>
                <span className="font-semibold text-amber-500">{stats.totalXp} XP</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <CircularProgress value={levelProgress.percentage} size={72} strokeWidth={6} />
              <div>
                <p className="text-sm text-slate-500">{t.progressToNext}</p>
                <p className="text-sm font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">
                  {levelProgress.currentXp} / {levelProgress.nextLevelXp} XP
                </p>
                <ProgressBar value={levelProgress.percentage} size="sm" className="mt-2" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/50 dark:border-slate-700/50 p-3">
                <p className="text-slate-500">{t.masteredWords}</p>
                <p className="font-semibold text-success-500">{masteredCount}</p>
              </div>
              <div className="rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/50 dark:border-slate-700/50 p-3">
                <p className="text-slate-500">{t.allWords}</p>
                <p className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">{vocabulary.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <UserCircle size={18} className="text-white" />
            </div>
            <h2 className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">{t.collection}</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.collectionDesc}
          </p>

          <div className="space-y-3">
            <h3 className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">{t.badges}</h3>
            {stats.badges.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {stats.badges.map((badge) => {
                  const Icon = badgeIcons[badge.icon as keyof typeof badgeIcons] || Trophy;
                  return (
                    <div
                      key={badge.id}
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/40 dark:to-orange-900/40 rounded-xl border border-amber-200 dark:border-amber-800"
                      title={getBadgeDescription(badge)}
                    >
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <Icon size={12} className="text-white" />
                      </div>
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-200">
                        {getBadgeName(badge)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{t.badgesEmpty}</p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">{t.skins}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {mascotSkins.map((skin) => (
                <MascotSkinCard
                  key={skin.id}
                  skin={skin}
                  selected={selectedSkin === skin.id}
                  onSelect={handleSkinSelect}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Folder size={18} className="text-white" />
            </div>
            <h2 className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">{t.setsTitle}</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              type="text"
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              placeholder={t.newSetPlaceholder}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Button variant="gradient" onClick={handleCreateSet} className="md:w-auto shadow-lg shadow-primary-500/25" disabled={!newSetName.trim()}>
              <Plus size={18} className="mr-2" />
              {t.addSet}
            </Button>
          </div>

          {sets.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t.noSets}
            </p>
          ) : (
            <div className="space-y-3">
              {sets.map((set) => {
                const count = setCounts[set.id] ?? 0;
                const isEditing = editingSetId === set.id;

                return (
                  <div
                    key={set.id}
                    data-testid="set-row"
                    className="flex flex-col gap-3 rounded-2xl border border-white/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-4 md:flex-row md:items-center"
                  >
                    <div className="flex-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingSetName}
                          onChange={(e) => setEditingSetName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        <p className="font-semibold text-slate-800 dark:text-slate-100">
                          {set.name}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">{t.wordsCount(count)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            variant="gradient"
                            size="sm"
                            onClick={handleSaveRename}
                            disabled={!editingSetName.trim()}
                          >
                            {t.save}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={handleCancelRename}>
                            {t.cancel}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartRename(set.id, set.name)}
                          >
                            <Pencil size={16} className="mr-1" />
                            {t.edit}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteSet(set.id, set.name)}
                          >
                            <Trash2 size={16} className="mr-1" />
                            {t.delete}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-slate-500">
            {t.unassigned(unassignedCount)}
          </p>
        </CardContent>
      </Card>

      {/* Billing Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <PricingSection
          currentPlan={subscriptionData?.plan ?? 'FREE'}
          subscriptionStatus={subscriptionData?.status}
          cancelAtPeriodEnd={subscriptionData?.cancelAtPeriodEnd}
          onUpgrade={handleUpgrade}
          onManage={handleManageSubscription}
        />
        {subscriptionData?.usage && (
          <UsageDisplay
            used={subscriptionData.usage.used}
            limit={subscriptionData.usage.limit}
            resetDate={subscriptionData.usage.resetDate}
          />
        )}
      </div>

      <section id="settings" className="scroll-mt-24 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">{t.settingsTitle}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.settingsDesc}</p>
          </div>
          <div className="flex items-center gap-3">
            {saveStatusLabel && (
              <span
                aria-live="polite"
                className={cn(
                  'text-xs font-medium',
                  saveState === 'saved' && 'text-success-600',
                  saveState === 'error' && 'text-error-600',
                  saveState === 'saving' && 'text-slate-500'
                )}
              >
                {saveStatusLabel}
              </span>
            )}
            <Button
              variant="gradient"
              onClick={handleSaveSettings}
              disabled={saveState === 'saving'}
              className="shadow-lg shadow-primary-500/25"
            >
              {saveState === 'saving' ? t.saving : t.save}
            </Button>
          </div>
        </div>
        {saveStatusLabel && (
          <div className="fixed right-4 top-[calc(1rem+env(safe-area-inset-top))] md:top-6 z-50 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-primary-200 dark:border-primary-800 px-4 py-2 text-xs font-medium text-primary-600 dark:text-primary-300 shadow-lg shadow-primary-500/10">
            {saveStatusLabel}
          </div>
        )}
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Compass size={18} className="text-white" />
              </div>
              <div>
                <h2 className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">
                  {t.learningProfile}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t.learningProfileDesc}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              {LEARNING_PAIRS.map((pair) => {
                const isSelected = pair.id === activePair.id;
                const label = pair.label[language] ?? pair.label.pl;
                const uiLabel = getLanguageLabel(pair.uiLanguage, language);
                const aiLabel = getLanguageLabel(pair.feedbackLanguage, language);

                return (
                  <button
                    key={pair.id}
                    onClick={() => setLearningPair(pair.id)}
                    className={cn(
                      'rounded-2xl border-2 p-4 text-left transition-all',
                      isSelected
                        ? 'border-transparent bg-gradient-to-br from-primary-50 to-pink-50 dark:from-primary-900/40 dark:to-pink-900/40 shadow-lg shadow-primary-500/20 ring-2 ring-primary-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:border-primary-300 dark:hover:border-primary-600'
                    )}
                  >
                    <div className={cn(
                      'text-sm font-semibold',
                      isSelected
                        ? 'bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent'
                        : 'text-slate-800 dark:text-slate-100'
                    )}>
                      {label}
                    </div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      UI: {uiLabel} • AI: {aiLabel}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">{t.learningProfileHint}</p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                <Target size={18} className="text-white" />
              </div>
              <h2 className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">
                {t.sessionSettings}
              </h2>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 dark:divide-slate-700">
            <SettingRow label={t.quizQuestions}>
              <Select
                value={settings.session.quizQuestionCount}
                options={[
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                  { value: 15, label: '15' },
                  { value: 20, label: '20' },
                  { value: 'all', label: t.all },
                ]}
                onChange={(v) =>
                  updateSettings('session', {
                    quizQuestionCount: v as 5 | 10 | 15 | 20 | 'all',
                  })
                }
              />
            </SettingRow>

            <SettingRow label={t.flashcardsPerSession}>
              <Select
                value={settings.session.flashcardCount}
                options={[
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                  { value: 15, label: '15' },
                  { value: 20, label: '20' },
                  { value: 'all', label: t.all },
                ]}
                onChange={(v) =>
                  updateSettings('session', {
                    flashcardCount: v as 5 | 10 | 15 | 20 | 'all',
                  })
                }
              />
            </SettingRow>

            <SettingRow label={t.timeLimit} description={t.timeLimitDesc}>
              <Select
                value={settings.session.timeLimit ?? 'none'}
                options={[
                  { value: 'none', label: t.none },
                  { value: 5, label: t.seconds(5) },
                  { value: 10, label: t.seconds(10) },
                  { value: 15, label: t.seconds(15) },
                  { value: 30, label: t.seconds(30) },
                ]}
                onChange={(v) =>
                  updateSettings('session', {
                    timeLimit: v === 'none' ? null : (v as 5 | 10 | 15 | 30),
                  })
                }
              />
            </SettingRow>

            <SettingRow label={t.wordOrder}>
              <Select
                value={settings.session.wordOrder}
                options={[
                  { value: 'random', label: t.wordOrderRandom },
                  { value: 'alphabetical', label: t.wordOrderAlphabetical },
                  { value: 'hardest_first', label: t.wordOrderHardest },
                ]}
                onChange={(v) =>
                  updateSettings('session', {
                    wordOrder: v as 'random' | 'alphabetical' | 'hardest_first',
                  })
                }
              />
            </SettingRow>

            <SettingRow label={t.repeatMistakes} description={t.repeatMistakesDesc}>
              <Toggle
                checked={settings.session.repeatMistakes}
                onChange={(v) => updateSettings('session', { repeatMistakes: v })}
              />
            </SettingRow>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Volume2 size={18} className="text-white" />
              </div>
              <h2 className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">
                {t.pronunciationSettings}
              </h2>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 dark:divide-slate-700">
            {isEnglishTarget ? (
              <SettingRow label={t.voice}>
                <Select
                  value={settings.pronunciation.voice}
                  options={[
                    { value: 'british', label: t.voiceBritish },
                    { value: 'american', label: t.voiceAmerican },
                    { value: 'australian', label: t.voiceAustralian },
                  ]}
                  onChange={(v) =>
                    updateSettings('pronunciation', {
                      voice: v as 'british' | 'american' | 'australian',
                    })
                  }
                />
              </SettingRow>
            ) : (
              <SettingRow label={t.voice} description={t.voiceAutoDesc}>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {t.voiceAuto}
                </span>
              </SettingRow>
            )}

            <SettingRow label={t.speechSpeed}>
              <Select
                value={settings.pronunciation.speed}
                options={[
                  { value: 0.7, label: t.speedSlow },
                  { value: 1, label: t.speedNormal },
                  { value: 1.2, label: t.speedFast },
                ]}
                onChange={(v) =>
                  updateSettings('pronunciation', {
                    speed: v as 0.7 | 1 | 1.2,
                  })
                }
              />
            </SettingRow>

            <SettingRow label={t.autoPlay} description={t.autoPlayDesc}>
              <Toggle
                checked={settings.pronunciation.autoPlay}
                onChange={(v) => updateSettings('pronunciation', { autoPlay: v })}
              />
            </SettingRow>

            <SettingRow label={t.passingScore} description={t.passingScoreDesc}>
              <Select
                value={settings.pronunciation.passingScore}
                options={[
                  { value: 5, label: '5/10' },
                  { value: 6, label: '6/10' },
                  { value: 7, label: '7/10' },
                  { value: 8, label: '8/10' },
                ]}
                onChange={(v) =>
                  updateSettings('pronunciation', {
                    passingScore: v as 5 | 6 | 7 | 8,
                  })
                }
              />
            </SettingRow>

            <SettingRow label={t.adaptiveDifficulty} description={t.adaptiveDifficultyDesc}>
              <Toggle
                checked={settings.pronunciation.adaptiveDifficulty}
                onChange={(v) => updateSettings('pronunciation', { adaptiveDifficulty: v })}
              />
            </SettingRow>

            <SettingRow label={t.phonemeHints} description={t.phonemeHintsDesc}>
              <Toggle
                checked={settings.pronunciation.showPhonemeHints}
                onChange={(v) => updateSettings('pronunciation', { showPhonemeHints: v })}
              />
            </SettingRow>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
                <Palette size={18} className="text-white" />
              </div>
              <h2 className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">
                {t.appearanceSound}
              </h2>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 dark:divide-slate-700">
            <SettingRow
              label={t.languageLabel}
              description={languagePreview}
            >
              <Select
                value={settings.general.language}
                options={[
                  { value: 'pl', label: t.languagePolish },
                  { value: 'en', label: t.languageEnglish },
                ]}
                onChange={(v) => updateSettings('general', { language: v as 'pl' | 'en' })}
              />
            </SettingRow>

            <SettingRow label={t.theme}>
              <Select
                value={settings.general.theme}
                options={[
                  { value: 'light', label: t.themeLight },
                  { value: 'dark', label: t.themeDark },
                  { value: 'auto', label: t.themeAuto },
                ]}
                onChange={(v) => updateSettings('general', { theme: v as 'light' | 'dark' | 'auto' })}
              />
            </SettingRow>

            <SettingRow label={t.sounds} description={t.soundsDesc}>
              <Toggle
                checked={settings.general.sounds}
                onChange={(v) => updateSettings('general', { sounds: v })}
              />
            </SettingRow>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 via-blue-500 to-pink-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                <Wand2 size={18} className="text-white" />
              </div>
              <h2 className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">{t.aiAssistant}</h2>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 dark:divide-slate-700">
            <SettingRow label={t.aiFeedbackDetail}>
              <Select
                value={settings.ai.feedbackDetail}
                options={[
                  { value: 'short', label: t.aiFeedbackShort },
                  { value: 'detailed', label: t.aiFeedbackDetailed },
                ]}
                onChange={(v) =>
                  updateSettings('ai', {
                    feedbackDetail: v as 'short' | 'detailed',
                  })
                }
              />
            </SettingRow>

            <SettingRow label={t.aiFeedbackLanguage}>
              <Select
                value={settings.ai.feedbackLanguage}
                options={[
                  { value: 'pl', label: t.languagePolish },
                  { value: 'en', label: t.languageEnglish },
                  { value: 'de', label: t.languageGerman },
                  { value: 'uk', label: t.languageUkrainian },
                ]}
                onChange={(v) =>
                  updateSettings('ai', {
                    feedbackLanguage: v as 'pl' | 'en' | 'de' | 'uk',
                  })
                }
              />
            </SettingRow>

            <SettingRow label={t.aiPhoneticHints} description={t.aiPhoneticHintsDesc}>
              <Toggle
                checked={settings.ai.phoneticHints}
                onChange={(v) => updateSettings('ai', { phoneticHints: v })}
              />
            </SettingRow>
          </CardContent>
        </Card>
      </section>

      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shadow-lg">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <h2 className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">{t.account}</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-slate-500">{t.signedInAs}</p>
              <p className="font-medium text-slate-800 dark:text-slate-100">{userEmail}</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full sm:w-auto bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800"
            >
              {t.logout}
            </Button>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
          <SettingRow label={t.restartOnboarding} description={t.restartOnboardingDesc}>
            <Button
              variant="secondary"
              onClick={handleRestartOnboarding}
              disabled={isRestartingOnboarding}
              className="w-full sm:w-auto bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm"
            >
              {t.restartOnboardingAction}
            </Button>
          </SettingRow>
          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
          <SettingRow label={t.exportData} description={t.exportDataDesc}>
            <Button
              variant="secondary"
              onClick={handleExportData}
              disabled={isExportingData}
              className="w-full sm:w-auto bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm"
            >
              {isExportingData ? t.exportingData : t.exportDataAction}
            </Button>
          </SettingRow>
          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
          <SettingRow label={t.deleteAccount} description={t.deleteAccountDesc}>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteAccountModal(true)}
              className="w-full sm:w-auto text-red-600 hover:text-red-700 bg-red-50/70 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 backdrop-blur-sm"
            >
              {t.deleteAccountAction}
            </Button>
          </SettingRow>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 max-w-md w-full p-6 space-y-4 border border-white/50 dark:border-slate-700/50">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-red-600 to-rose-500 bg-clip-text text-transparent">
              {t.deleteAccountConfirm}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t.deleteAccountWarning}
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteAccountModal(false)}
                disabled={isDeletingAccount}
                className="flex-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm"
              >
                {t.deleteAccountCancel}
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="flex-1 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 text-white shadow-lg shadow-red-500/25"
              >
                {isDeletingAccount ? t.deletingAccount : t.deleteAccountConfirmAction}
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

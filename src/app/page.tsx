'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  BookOpen,
  Compass,
  Flame,
  Mic,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar, CircularProgress } from '@/components/ui/ProgressBar';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';
import { useVocabStore, useHydration } from '@/lib/store';
import { useLanguage } from '@/lib/i18n';
import { BADGES, getLevelProgress } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/categories';
import { getMissionCopy } from '@/lib/missions';

const badgeIcons = {
  flame: Flame,
  sparkles: Sparkles,
  target: Target,
  mic: Mic,
  'book-open': BookOpen,
  trophy: Trophy,
};

const homeCopy = {
  pl: {
    loading: 'Ładowanie...',
    greeting: (name: string) => `Witaj, ${name}`,
    todayAdventure: 'Twoja dzisiejsza przygoda',
    streak: (days: number) => `Seria ${days}`,
    dailyMission: 'Misja dnia',
    missionContinue: 'Kontynuuj naukę',
    missionStart: 'Start misji',
    dueWords: (count: number) => `Do powtórki: ${count} słówek`,
    flashcards: 'Fiszki',
    flashcardsDesc: 'Szybki sprint 3 min',
    quiz: 'Quiz',
    quizDesc: 'Wyzwanie na czas',
    classTest: 'Klasówka w 5 min',
    classTestDesc: 'Wklej słówka i od razu zacznij quiz',
    pronunciation: 'Wymowa',
    pronunciationDesc: 'Trening głosu',
    pronunciationStats: (avg: number, streak: number) =>
      `Średnia ${avg.toFixed(1)}/10 • Streak ${streak}`,
    pronunciationEmpty: 'Zrób 5 słów i złap pierwszy wynik.',
    pronunciationWeak: (count: number) => `Słabe słowa: ${count}`,
    pronunciationNew: 'Nowe słowa: szybka rozgrzewka',
    guide: 'Twój przewodnik',
    adventureMode: 'Tryb przygody',
    guideNote: 'Dzisiaj celem jest utrzymanie tempa. Wybierz misję i zdobądź nagrodę.',
    levelLabel: (level: number) => `Poziom ${level}`,
    progressToNext: 'Postęp do następnego poziomu',
    progressByCategory: 'Postęp według kategorii',
    overallProgress: 'Ogólny postęp',
    totalWords: 'Wszystkich słówek',
    mastered: 'Opanowanych',
    longestStreak: 'Najdłuższa seria',
    sessionsCompleted: 'Sesji ukończonych',
    badges: 'Twoje odznaki',
    defaultName: 'Odkrywco',
  },
  en: {
    loading: 'Loading...',
    greeting: (name: string) => `Welcome, ${name}`,
    todayAdventure: "Today's adventure",
    streak: (days: number) => `Streak ${days}`,
    dailyMission: 'Daily mission',
    missionContinue: 'Continue learning',
    missionStart: 'Start mission',
    dueWords: (count: number) => `Due: ${count} words`,
    flashcards: 'Flashcards',
    flashcardsDesc: 'Quick 3‑min sprint',
    quiz: 'Quiz',
    quizDesc: 'Time challenge',
    classTest: 'Test in 5 minutes',
    classTestDesc: 'Paste words and start the quiz fast',
    pronunciation: 'Pronunciation',
    pronunciationDesc: 'Voice training',
    pronunciationStats: (avg: number, streak: number) =>
      `Avg ${avg.toFixed(1)}/10 • Streak ${streak}`,
    pronunciationEmpty: 'Do 5 words and get your first score.',
    pronunciationWeak: (count: number) => `Weak words: ${count}`,
    pronunciationNew: 'New words: quick warm-up',
    guide: 'Your guide',
    adventureMode: 'Adventure mode',
    guideNote: 'Today the goal is to keep momentum. Pick a mission and earn a reward.',
    levelLabel: (level: number) => `Level ${level}`,
    progressToNext: 'Progress to next level',
    progressByCategory: 'Progress by category',
    overallProgress: 'Overall progress',
    totalWords: 'Total words',
    mastered: 'Mastered',
    longestStreak: 'Longest streak',
    sessionsCompleted: 'Sessions completed',
    badges: 'Your badges',
    defaultName: 'Explorer',
  },
  uk: {
    loading: 'Завантаження...',
    greeting: (name: string) => `Вітаю, ${name}`,
    todayAdventure: 'Твоя сьогоднішня пригода',
    streak: (days: number) => `Серія ${days}`,
    dailyMission: 'Місія дня',
    missionContinue: 'Продовжити навчання',
    missionStart: 'Почати місію',
    dueWords: (count: number) => `До повторення: ${count} слів`,
    flashcards: 'Флешкарти',
    flashcardsDesc: 'Швидкий спринт на 3 хв',
    quiz: 'Квіз',
    quizDesc: 'Часовий виклик',
    classTest: 'Контрольна за 5 хв',
    classTestDesc: 'Встав слова й одразу почни квіз',
    pronunciation: 'Вимова',
    pronunciationDesc: 'Тренування голосу',
    pronunciationStats: (avg: number, streak: number) =>
      `Середнє ${avg.toFixed(1)}/10 • Серія ${streak}`,
    pronunciationEmpty: 'Спробуй 5 слів і отримай перший результат.',
    pronunciationWeak: (count: number) => `Слабкі слова: ${count}`,
    pronunciationNew: 'Нові слова: швидка розминка',
    guide: 'Твій провідник',
    adventureMode: 'Режим пригоди',
    guideNote: 'Сьогодні мета — зберегти темп. Обери місію та здобудь нагороду.',
    levelLabel: (level: number) => `Рівень ${level}`,
    progressToNext: 'Прогрес до наступного рівня',
    progressByCategory: 'Прогрес за категоріями',
    overallProgress: 'Загальний прогрес',
    totalWords: 'Усі слова',
    mastered: 'Вивчені',
    longestStreak: 'Найдовша серія',
    sessionsCompleted: 'Сесій завершено',
    badges: 'Твої відзнаки',
    defaultName: 'Досліднику',
  },
} as const;

type HomeCopy = typeof homeCopy.pl;

export default function HomePage() {
  const hydrated = useHydration();
  const { data: session } = useSession();
  const language = useLanguage();
  const t = (homeCopy[language] ?? homeCopy.pl) as HomeCopy;
  const stats = useVocabStore((state) => state.stats);
  const vocabulary = useVocabStore((state) => state.getActiveVocabulary());
  const progress = useVocabStore((state) => state.progress);
  const getCategorySummary = useVocabStore((state) => state.getCategorySummary);
  const getNextReviewWords = useVocabStore((state) => state.getNextReviewWords);
  const getWeakPronunciationWords = useVocabStore((state) => state.getWeakPronunciationWords);
  const dailyMission = useVocabStore((state) => state.dailyMission);

  const categorySummary = getCategorySummary();
  const dueWords = getNextReviewWords('all');
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

  const overallMastery =
    vocabulary.length > 0
      ? Math.round((masteredCount / vocabulary.length) * 100)
      : 0;

  const missionProgress = Math.min(
    100,
    Math.round((dailyMission.progress / dailyMission.target) * 100)
  );

  const missionButtonLabel = dailyMission.completed
    ? t.missionContinue
    : t.missionStart;

  const userName = session?.user?.name?.split(' ')[0] || t.defaultName;
  const mascotSkin = session?.user?.mascotSkin || 'explorer';
  const missionCopy = getMissionCopy(language, dailyMission.type);
  const weakPronunciationCount = getWeakPronunciationWords(100).length;
  const hasPronunciationStats = stats.totalPronunciationSessions > 0;
  const pronunciationMeta = hasPronunciationStats
    ? t.pronunciationStats(stats.averagePronunciationScore || 0, stats.pronunciationStreak || 0)
    : t.pronunciationEmpty;
  const pronunciationFocus = weakPronunciationCount > 0
    ? t.pronunciationWeak(weakPronunciationCount)
    : t.pronunciationNew;
  const pronunciationHref =
    weakPronunciationCount > 0
      ? '/pronunciation?focus=weak_words&length=5'
      : '/pronunciation?focus=new_words&length=5';

  if (!hydrated) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 space-y-8 max-w-6xl mx-auto">
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm text-slate-500">{t.greeting(userName)}</p>
              <h1 className="font-display text-3xl text-slate-900 dark:text-white">
                {t.todayAdventure}
              </h1>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-amber-500">
                <Flame size={18} />
                <span className="font-semibold">{t.streak(stats.currentStreak)}</span>
              </div>
              <div className="flex items-center gap-1 text-amber-600">
                <Star size={18} />
                <span className="font-semibold">{stats.totalXp} XP</span>
              </div>
            </div>
          </div>

          <Card variant="elevated" className="overflow-hidden">
            <CardContent className="p-6 bg-gradient-to-br from-primary-600 via-primary-500 to-amber-400 text-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-white/80">
                    <Compass size={14} />
                    {t.dailyMission}
                  </div>
                  <h2 className="mt-2 font-display text-2xl">{missionCopy.title}</h2>
                  <p className="text-sm text-white/80 mt-2">
                    {missionCopy.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs">
                    <Sparkles size={14} />
                    +{dailyMission.rewardXp} XP
                  </div>
                  <p className="mt-3 text-sm font-semibold">
                    {dailyMission.progress}/{dailyMission.target}
                  </p>
                </div>
              </div>
              <ProgressBar value={missionProgress} size="sm" className="mt-4" />
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link href="/flashcards">
                  <Button variant="secondary">
                    {missionButtonLabel}
                  </Button>
                </Link>
                <span className="text-xs text-white/80">
                  {t.dueWords(dueWords.length)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/flashcards">
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center">
                    <BookOpen size={22} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {t.flashcards}
                    </p>
                    <p className="text-sm text-slate-500">{t.flashcardsDesc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/quiz">
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Target size={22} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {t.quiz}
                    </p>
                    <p className="text-sm text-slate-500">{t.quizDesc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/klasowka">
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center">
                    <Zap size={22} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {t.classTest}
                    </p>
                    <p className="text-sm text-slate-500">{t.classTestDesc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href={pronunciationHref}>
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-success-100 text-success-600 flex items-center justify-center">
                    <Mic size={22} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {t.pronunciation}
                    </p>
                    <p className="text-sm text-slate-500">{t.pronunciationDesc}</p>
                    <p className="text-xs text-slate-500 mt-2">{pronunciationMeta}</p>
                    <p className="text-xs text-slate-500">{pronunciationFocus}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="bg-white/80 dark:bg-slate-900/70 border border-white/60">
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{t.guide}</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{userName}</p>
                </div>
                <span className="text-xs text-primary-600">{t.adventureMode}</span>
              </div>
              <div className="flex justify-center">
                <MascotAvatar skinId={mascotSkin} size={160} />
              </div>
              <div className="rounded-2xl bg-primary-50 dark:bg-primary-900/30 p-4 text-sm text-primary-700 dark:text-primary-200">
                {t.guideNote}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <CircularProgress value={levelProgress.percentage} size={72} strokeWidth={6} />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {t.levelLabel(levelProgress.level)}
                </p>
                <p className="text-sm text-slate-500">{t.progressToNext}</p>
                <p className="text-sm text-slate-500">
                  {levelProgress.currentXp} / {levelProgress.nextLevelXp} XP
                </p>
                <ProgressBar value={levelProgress.percentage} size="sm" className="mt-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-primary-600" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              {t.progressByCategory}
            </h2>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {categorySummary.map((cat) => (
            <div key={cat.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-300">
                  {getCategoryLabel(cat.name, language)}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {cat.masteredWords}/{cat.totalWords}
                </span>
              </div>
              <ProgressBar
                value={cat.masteryPercentage}
                variant={
                  cat.masteryPercentage >= 80
                    ? 'success'
                    : cat.masteryPercentage >= 50
                    ? 'warning'
                    : 'default'
                }
                size="sm"
              />
            </div>
          ))}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {t.overallProgress}
              </span>
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                {overallMastery}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {vocabulary.length}
            </p>
            <p className="text-xs text-slate-500">{t.totalWords}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success-600 dark:text-success-400">
              {masteredCount}
            </p>
            <p className="text-xs text-slate-500">{t.mastered}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">
              {stats.longestStreak}
            </p>
            <p className="text-xs text-slate-500">{t.longestStreak}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {stats.totalSessionsCompleted}
            </p>
            <p className="text-xs text-slate-500">{t.sessionsCompleted}</p>
          </CardContent>
        </Card>
      </div>

      {stats.badges.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-amber-500" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                {t.badges}
              </h2>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              {stats.badges.map((badge) => {
                const Icon = badgeIcons[badge.icon as keyof typeof badgeIcons] || Trophy;
                return (
                  <div
                    key={badge.id}
                    className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/40 rounded-xl"
                    title={getBadgeDescription(badge)}
                  >
                    <Icon size={18} className="text-amber-600" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-200">
                      {getBadgeName(badge)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

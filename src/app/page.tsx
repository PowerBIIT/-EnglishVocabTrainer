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
import { getLevelProgress } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/categories';

const badgeIcons = {
  flame: Flame,
  sparkles: Sparkles,
  target: Target,
  mic: Mic,
  'book-open': BookOpen,
  trophy: Trophy,
};

export default function HomePage() {
  const hydrated = useHydration();
  const { data: session } = useSession();
  const stats = useVocabStore((state) => state.stats);
  const vocabulary = useVocabStore((state) => state.vocabulary);
  const progress = useVocabStore((state) => state.progress);
  const getCategorySummary = useVocabStore((state) => state.getCategorySummary);
  const getNextReviewWords = useVocabStore((state) => state.getNextReviewWords);
  const dailyMission = useVocabStore((state) => state.dailyMission);

  const categorySummary = getCategorySummary();
  const dueWords = getNextReviewWords('all');
  const levelProgress = getLevelProgress(stats.totalXp);

  const masteredCount = Object.values(progress).filter(
    (p) => p.status === 'mastered'
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
    ? 'Kontynuuj naukę'
    : 'Start misji';

  const userName = session?.user?.name?.split(' ')[0] || 'Odkrywco';
  const mascotSkin = session?.user?.mascotSkin || 'explorer';

  if (!hydrated) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Ładowanie...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 space-y-8 max-w-6xl mx-auto">
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm text-slate-500">Witaj, {userName}</p>
              <h1 className="font-display text-3xl text-slate-900 dark:text-white">
                Twoja dzisiejsza przygoda
              </h1>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-amber-500">
                <Flame size={18} />
                <span className="font-semibold">Seria {stats.currentStreak}</span>
              </div>
              <div className="flex items-center gap-1 text-amber-600">
                <Star size={18} />
                <span className="font-semibold">{stats.totalXp} XP</span>
              </div>
            </div>
          </div>

          <Card variant="elevated" className="overflow-hidden">
            <CardContent className="p-6 bg-gradient-to-br from-primary-600 via-primary-500 to-amber-400 text-white">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-white/80">
                    <Compass size={14} />
                    Misja dnia
                  </div>
                  <h2 className="mt-2 font-display text-2xl">{dailyMission.title}</h2>
                  <p className="text-sm text-white/80 mt-2">
                    {dailyMission.description}
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
                  <Button variant="secondary" className="text-primary-700">
                    {missionButtonLabel}
                  </Button>
                </Link>
                <span className="text-xs text-white/80">
                  Do powtórki: {dueWords.length} słówek
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/flashcards">
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center">
                    <BookOpen size={22} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Fiszki</p>
                    <p className="text-sm text-slate-500">Szybki sprint 3 min</p>
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
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Quiz</p>
                    <p className="text-sm text-slate-500">Wyzwanie na czas</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/pronunciation">
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-success-100 text-success-600 flex items-center justify-center">
                    <Mic size={22} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Wymowa</p>
                    <p className="text-sm text-slate-500">Trening głosu</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="bg-white/80 dark:bg-slate-900/70 border border-white/60">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Twój przewodnik</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{userName}</p>
                </div>
                <span className="text-xs text-primary-600">Tryb przygody</span>
              </div>
              <div className="flex justify-center">
                <MascotAvatar skinId={mascotSkin} size={160} />
              </div>
              <div className="rounded-2xl bg-primary-50 dark:bg-primary-900/30 p-4 text-sm text-primary-700 dark:text-primary-200">
                Dzisiaj celem jest utrzymanie tempa. Wybierz misję i zdobądź nagrodę.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <CircularProgress value={levelProgress.percentage} size={72} strokeWidth={6} />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  Poziom {levelProgress.level}
                </p>
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
              Postęp według kategorii
            </h2>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {categorySummary.map((cat) => (
            <div key={cat.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-300">
                  {getCategoryLabel(cat.name)}
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
                Ogólny postęp
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
            <p className="text-xs text-slate-500">Wszystkich słówek</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success-600 dark:text-success-400">
              {masteredCount}
            </p>
            <p className="text-xs text-slate-500">Opanowanych</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">
              {stats.longestStreak}
            </p>
            <p className="text-xs text-slate-500">Najdłuższa seria</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {stats.totalSessionsCompleted}
            </p>
            <p className="text-xs text-slate-500">Sesji ukończonych</p>
          </CardContent>
        </Card>
      </div>

      {stats.badges.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-amber-500" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                Twoje odznaki
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
                    title={badge.description}
                  >
                    <Icon size={18} className="text-amber-600" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-200">
                      {badge.name}
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

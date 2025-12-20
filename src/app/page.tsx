'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  Star,
  BookOpen,
  Trophy,
  Play,
  Target,
  TrendingUp,
  Clock,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar, CircularProgress } from '@/components/ui/ProgressBar';
import { useVocabStore, useHydration } from '@/lib/store';
import { getLevelProgress } from '@/lib/utils';

export default function HomePage() {
  const hydrated = useHydration();
  const stats = useVocabStore((state) => state.stats);
  const vocabulary = useVocabStore((state) => state.vocabulary);
  const progress = useVocabStore((state) => state.progress);
  const getCategorySummary = useVocabStore((state) => state.getCategorySummary);
  const getNextReviewWords = useVocabStore((state) => state.getNextReviewWords);

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

  // Show loading state until hydration is complete
  if (!hydrated) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Ładowanie...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Cześć! 👋
        </h1>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-orange-500">
            <Flame size={18} />
            <span className="font-semibold">Seria: {stats.currentStreak} dni</span>
          </div>
          <div className="flex items-center gap-1 text-amber-500">
            <Star size={18} />
            <span className="font-semibold">{stats.totalXp} XP</span>
          </div>
        </div>
      </div>

      {/* Level progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <CircularProgress
                value={levelProgress.percentage}
                size={70}
                strokeWidth={6}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {levelProgress.level}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-800 dark:text-slate-100">
                Poziom {levelProgress.level}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {levelProgress.currentXp} / {levelProgress.nextLevelXp} XP do następnego
              </p>
              <ProgressBar
                value={levelProgress.percentage}
                size="sm"
                className="mt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Do powtórki: {dueWords.length} słówek
        </p>

        <Link href="/flashcards" className="block">
          <Card
            variant="elevated"
            className="bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 transition-all"
          >
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Zacznij naukę</h3>
                <p className="text-primary-100 text-sm">
                  Fiszki + Quiz + Wymowa
                </p>
              </div>
              <Play size={40} className="text-white/80" />
            </CardContent>
          </Card>
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/flashcards">
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <BookOpen
                  size={32}
                  className="mx-auto text-primary-500 mb-2"
                />
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  Fiszki
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/quiz">
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <Target size={32} className="mx-auto text-amber-500 mb-2" />
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  Quiz
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Progress by category */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-primary-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              Twój postęp
            </h2>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {categorySummary.map((cat) => (
            <div key={cat.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-300">
                  {cat.name}
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

      {/* Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-amber-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              Statystyki
            </h2>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {vocabulary.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Wszystkich słówek
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
              <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                {masteredCount}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Opanowanych
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
              <p className="text-2xl font-bold text-orange-500">
                {stats.longestStreak}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Najdłuższa seria
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {stats.totalSessionsCompleted}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sesji ukończonych
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      {stats.badges.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-amber-500" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                Twoje odznaki
              </h2>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              {stats.badges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900 rounded-xl"
                  title={badge.description}
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    {badge.name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

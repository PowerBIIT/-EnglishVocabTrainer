'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
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
import { useHydration, useVocabStore } from '@/lib/store';
import { mascotSkins } from '@/data/mascotSkins';
import { MascotSkinCard } from '@/components/mascot/MascotSkinCard';
import { cn, getLevelProgress } from '@/lib/utils';

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
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <p className="font-medium text-slate-800 dark:text-slate-100">{label}</p>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

const missionRoutes: Record<string, { href: string; label: string }> = {
  flashcards: { href: '/flashcards', label: 'Fiszki' },
  quiz: { href: '/quiz', label: 'Quiz' },
  pronunciation: { href: '/pronunciation', label: 'Wymowa' },
  mixed: { href: '/flashcards', label: 'Tryb mieszany' },
};

export default function ProfilePage() {
  const hydrated = useHydration();
  const { data: session, update } = useSession();
  const [selectedSkin, setSelectedSkin] = useState('explorer');

  const settings = useVocabStore((state) => state.settings);
  const updateSettings = useVocabStore((state) => state.updateSettings);
  const stats = useVocabStore((state) => state.stats);
  const vocabulary = useVocabStore((state) => state.vocabulary);
  const sets = useVocabStore((state) => state.sets);
  const createSet = useVocabStore((state) => state.createSet);
  const renameSet = useVocabStore((state) => state.renameSet);
  const deleteSet = useVocabStore((state) => state.deleteSet);
  const progress = useVocabStore((state) => state.progress);
  const dailyMission = useVocabStore((state) => state.dailyMission);
  const [newSetName, setNewSetName] = useState('');
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editingSetName, setEditingSetName] = useState('');

  useEffect(() => {
    if (session?.user?.mascotSkin) {
      setSelectedSkin(session.user.mascotSkin);
    }
  }, [session?.user?.mascotSkin]);

  const handleSkinSelect = async (skinId: string) => {
    setSelectedSkin(skinId);
    await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mascotSkin: skinId }),
    });
    await update({ mascotSkin: skinId });
  };

  const userName = session?.user?.name || 'Użytkownik';
  const userEmail = session?.user?.email || 'Brak e-maila';
  const userInitials = useMemo(() => {
    const parts = userName.split(' ').filter(Boolean);
    if (parts.length === 0) return 'EV';
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [userName]);

  const levelProgress = getLevelProgress(stats.totalXp);
  const masteredCount = Object.values(progress).filter((p) => p.status === 'mastered').length;

  const missionProgress = Math.min(
    100,
    Math.round((dailyMission.progress / dailyMission.target) * 100)
  );

  const missionRoute = missionRoutes[dailyMission.type] ?? missionRoutes.flashcards;

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
    const confirmation = confirm(
      `Usunąć zestaw "${name}"? Słówka pozostaną w bibliotece bez przypisanego zestawu.`
    );
    if (!confirmation) return;
    deleteSet(setId);
  };

  if (!hydrated) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Ładowanie...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 space-y-6 max-w-5xl mx-auto pb-28">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl overflow-hidden bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-lg">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={userName}
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            ) : (
              userInitials
            )}
          </div>
          <div>
            <p className="text-sm text-slate-500">Profil</p>
            <h1 className="font-display text-2xl text-slate-900 dark:text-white">
              {userName}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{userEmail}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => signOut({ callbackUrl: '/login' })}>
          <LogOut size={18} className="mr-2" />
          Wyloguj
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <Card variant="elevated" className="overflow-hidden">
          <CardContent className="p-6 bg-gradient-to-br from-primary-600 via-primary-500 to-amber-400 text-white">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-white/80">
                  <Compass size={14} />
                  Misja dzienna
                </div>
                <h2 className="mt-2 font-display text-2xl">{dailyMission.title}</h2>
                <p className="text-sm text-white/80 mt-2">{dailyMission.description}</p>
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
              <Link href={missionRoute.href}>
                <Button variant="secondary" className="text-primary-700">
                  {dailyMission.completed ? 'Kontynuuj' : 'Start'} • {missionRoute.label}
                </Button>
              </Link>
              <span className="text-xs text-white/80">Utrzymaj serię: {stats.currentStreak} dni</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Twój poziom</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  Level {levelProgress.level}
                </p>
              </div>
              <div className="flex items-center gap-2 text-amber-500">
                <Star size={18} />
                <span className="font-semibold">{stats.totalXp} XP</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <CircularProgress value={levelProgress.percentage} size={72} strokeWidth={6} />
              <div>
                <p className="text-sm text-slate-500">Postęp do następnego poziomu</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {levelProgress.currentXp} / {levelProgress.nextLevelXp} XP
                </p>
                <ProgressBar value={levelProgress.percentage} size="sm" className="mt-2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-slate-500">Opanowane słówka</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{masteredCount}</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-slate-500">Wszystkie słówka</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{vocabulary.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCircle size={20} className="text-primary-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Kolekcja</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Twoje odznaki i skiny rozwijają się razem z postępem.
          </p>

          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Odznaki</h3>
            {stats.badges.length > 0 ? (
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
            ) : (
              <p className="text-sm text-slate-500">
                Pierwsze odznaki pojawią się po ukończeniu misji.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Skiny przewodnika</h3>
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Folder size={20} className="text-primary-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Zestawy słówek</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              type="text"
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              placeholder="Nowy zestaw (np. Klasówka z biologii)"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Button onClick={handleCreateSet} className="md:w-auto" disabled={!newSetName.trim()}>
              <Plus size={18} className="mr-2" />
              Dodaj zestaw
            </Button>
          </div>

          {sets.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Brak zestawów. Dodaj pierwszy, aby szybciej wybierać słówka do testów.
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
                    className="flex flex-col gap-3 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 md:flex-row md:items-center"
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
                      <p className="text-xs text-slate-500">{count} słówek</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleSaveRename}
                            disabled={!editingSetName.trim()}
                          >
                            Zapisz
                          </Button>
                          <Button variant="ghost" size="sm" onClick={handleCancelRename}>
                            Anuluj
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
                            Edytuj
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteSet(set.id, set.name)}
                          >
                            <Trash2 size={16} className="mr-1" />
                            Usuń
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
            Bez zestawu: {unassignedCount} słówek
          </p>
        </CardContent>
      </Card>

      <section id="settings" className="scroll-mt-24 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target size={20} className="text-primary-500" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Ustawienia sesji</h2>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 dark:divide-slate-700">
            <SettingRow label="Pytań w quizie">
              <Select
                value={settings.session.quizQuestionCount}
                options={[
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                  { value: 15, label: '15' },
                  { value: 20, label: '20' },
                  { value: 'all', label: 'Wszystkie' },
                ]}
                onChange={(v) =>
                  updateSettings('session', {
                    quizQuestionCount: v as 5 | 10 | 15 | 20 | 'all',
                  })
                }
              />
            </SettingRow>

            <SettingRow label="Fiszek w sesji">
              <Select
                value={settings.session.flashcardCount}
                options={[
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                  { value: 15, label: '15' },
                  { value: 20, label: '20' },
                  { value: 'all', label: 'Wszystkie' },
                ]}
                onChange={(v) =>
                  updateSettings('session', {
                    flashcardCount: v as 5 | 10 | 15 | 20 | 'all',
                  })
                }
              />
            </SettingRow>

            <SettingRow label="Limit czasu" description="Na odpowiedź w quizie">
              <Select
                value={settings.session.timeLimit ?? 'none'}
                options={[
                  { value: 'none', label: 'Brak' },
                  { value: 5, label: '5 sekund' },
                  { value: 10, label: '10 sekund' },
                  { value: 15, label: '15 sekund' },
                  { value: 30, label: '30 sekund' },
                ]}
                onChange={(v) =>
                  updateSettings('session', {
                    timeLimit: v === 'none' ? null : (v as 5 | 10 | 15 | 30),
                  })
                }
              />
            </SettingRow>

            <SettingRow label="Kolejność słówek">
              <Select
                value={settings.session.wordOrder}
                options={[
                  { value: 'random', label: 'Losowa' },
                  { value: 'alphabetical', label: 'Alfabetyczna' },
                  { value: 'hardest_first', label: 'Najtrudniejsze' },
                ]}
                onChange={(v) =>
                  updateSettings('session', {
                    wordOrder: v as 'random' | 'alphabetical' | 'hardest_first',
                  })
                }
              />
            </SettingRow>

            <SettingRow label="Powtórki błędnych" description="Powtarzaj błędne odpowiedzi">
              <Toggle
                checked={settings.session.repeatMistakes}
                onChange={(v) => updateSettings('session', { repeatMistakes: v })}
              />
            </SettingRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Volume2 size={20} className="text-primary-500" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Ustawienia wymowy</h2>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 dark:divide-slate-700">
            <SettingRow label="Głos">
              <Select
                value={settings.pronunciation.voice}
                options={[
                  { value: 'british', label: 'Brytyjski' },
                  { value: 'american', label: 'Amerykański' },
                  { value: 'australian', label: 'Australijski' },
                ]}
                onChange={(v) =>
                  updateSettings('pronunciation', {
                    voice: v as 'british' | 'american' | 'australian',
                  })
                }
              />
            </SettingRow>

            <SettingRow label="Prędkość mowy">
              <Select
                value={settings.pronunciation.speed}
                options={[
                  { value: 0.7, label: 'Wolna' },
                  { value: 1, label: 'Normalna' },
                  { value: 1.2, label: 'Szybka' },
                ]}
                onChange={(v) =>
                  updateSettings('pronunciation', {
                    speed: v as 0.7 | 1 | 1.2,
                  })
                }
              />
            </SettingRow>

            <SettingRow label="Auto-odtwarzanie" description="Automatycznie odtwarzaj wymowę">
              <Toggle
                checked={settings.pronunciation.autoPlay}
                onChange={(v) => updateSettings('pronunciation', { autoPlay: v })}
              />
            </SettingRow>

            <SettingRow label="Próg zaliczenia" description="Minimalna ocena wymowy">
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

            <SettingRow label="Adaptacyjna trudność" description="Dostosuj trudność do poziomu">
              <Toggle
                checked={settings.pronunciation.adaptiveDifficulty}
                onChange={(v) => updateSettings('pronunciation', { adaptiveDifficulty: v })}
              />
            </SettingRow>

            <SettingRow label="Wskazówki fonemowe" description="Pokaż porady o pozycji ust">
              <Toggle
                checked={settings.pronunciation.showPhonemeHints}
                onChange={(v) => updateSettings('pronunciation', { showPhonemeHints: v })}
              />
            </SettingRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette size={20} className="text-primary-500" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Wygląd i dźwięk</h2>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 dark:divide-slate-700">
            <SettingRow label="Język interfejsu">
              <Select
                value={settings.general.language}
                options={[
                  { value: 'pl', label: 'Polski' },
                  { value: 'en', label: 'English' },
                ]}
                onChange={(v) => updateSettings('general', { language: v as 'pl' | 'en' })}
              />
            </SettingRow>

            <SettingRow label="Motyw">
              <Select
                value={settings.general.theme}
                options={[
                  { value: 'light', label: 'Jasny' },
                  { value: 'dark', label: 'Ciemny' },
                  { value: 'auto', label: 'Automatyczny' },
                ]}
                onChange={(v) => updateSettings('general', { theme: v as 'light' | 'dark' | 'auto' })}
              />
            </SettingRow>

            <SettingRow label="Dźwięki" description="Efekty dźwiękowe w aplikacji">
              <Toggle
                checked={settings.general.sounds}
                onChange={(v) => updateSettings('general', { sounds: v })}
              />
            </SettingRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wand2 size={20} className="text-primary-500" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Asystent AI</h2>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 dark:divide-slate-700">
            <SettingRow label="Szczegółowość feedbacku">
              <Select
                value={settings.ai.feedbackDetail}
                options={[
                  { value: 'short', label: 'Krótki' },
                  { value: 'detailed', label: 'Szczegółowy' },
                ]}
                onChange={(v) =>
                  updateSettings('ai', {
                    feedbackDetail: v as 'short' | 'detailed',
                  })
                }
              />
            </SettingRow>

            <SettingRow label="Język feedbacku AI">
              <Select
                value={settings.ai.feedbackLanguage}
                options={[
                  { value: 'pl', label: 'Polski' },
                  { value: 'en', label: 'English' },
                ]}
                onChange={(v) => updateSettings('ai', { feedbackLanguage: v as 'pl' | 'en' })}
              />
            </SettingRow>

            <SettingRow label="Wskazówki fonetyczne" description="Pokazuj porady dotyczące wymowy">
              <Toggle
                checked={settings.ai.phoneticHints}
                onChange={(v) => updateSettings('ai', { phoneticHints: v })}
              />
            </SettingRow>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Konto</h2>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Zalogowany jako</p>
            <p className="font-medium text-slate-800 dark:text-slate-100">{userEmail}</p>
          </div>
          <Button variant="secondary" onClick={() => signOut({ callbackUrl: '/login' })}>
            Wyloguj
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

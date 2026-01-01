'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Search,
  Filter,
  Volume2,
  Trash2,
  Plus,
  BookOpen,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useVocabStore, useHydration } from '@/lib/store';
import { VocabularyItem } from '@/types';
import { cn, speak } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/categories';
import { useLanguage } from '@/lib/i18n';
import {
  getNativeText,
  getSpeechLocale,
  getTargetExample,
  getTargetText,
} from '@/lib/languages';

const vocabularyCopy = {
  pl: {
    loading: 'Ładowanie...',
    title: 'Moje słówka',
    summary: (words: number, categories: number) => `${words} słówek w ${categories} kategoriach`,
    cancel: 'Anuluj',
    select: 'Wybierz',
    moveSelected: 'Przenieś zaznaczone słówka do zestawu',
    targetSet: 'Zestaw docelowy',
    createNewSet: 'Utwórz nowy zestaw',
    unassigned: 'Bez zestawu',
    newSetName: 'Nazwa nowego zestawu',
    newSetPlaceholder: 'Np. Klasówka z biologii',
    move: (count: number) => `Przenieś (${count})`,
    searchPlaceholder: 'Szukaj słówek...',
    sets: 'Zestawy',
    allSets: (count: number) => `Wszystkie zestawy (${count})`,
    categories: 'Kategorie',
    allCategories: 'Wszystkie kategorie',
    mastered: 'Opanowane',
    learning: 'W trakcie',
    newWords: 'Nowe',
    setFallback: 'Zestaw',
    difficultyEasy: 'Łatwe',
    difficultyMedium: 'Średnie',
    difficultyHard: 'Trudne',
    emptySearch: 'Nie znaleziono słówek',
    emptyCategory: 'Brak słówek w tej kategorii',
    deleteConfirm: (count: number) => `Czy na pewno chcesz usunąć ${count} słówek?`,
  },
  en: {
    loading: 'Loading...',
    title: 'My vocabulary',
    summary: (words: number, categories: number) => `${words} words across ${categories} categories`,
    cancel: 'Cancel',
    select: 'Select',
    moveSelected: 'Move selected words to a set',
    targetSet: 'Target set',
    createNewSet: 'Create new set',
    unassigned: 'Unassigned',
    newSetName: 'New set name',
    newSetPlaceholder: 'e.g. Biology test',
    move: (count: number) => `Move (${count})`,
    searchPlaceholder: 'Search words...',
    sets: 'Sets',
    allSets: (count: number) => `All sets (${count})`,
    categories: 'Categories',
    allCategories: 'All categories',
    mastered: 'Mastered',
    learning: 'Learning',
    newWords: 'New',
    setFallback: 'Set',
    difficultyEasy: 'Easy',
    difficultyMedium: 'Medium',
    difficultyHard: 'Hard',
    emptySearch: 'No words found',
    emptyCategory: 'No words in this category',
    deleteConfirm: (count: number) => `Are you sure you want to delete ${count} words?`,
  },
  uk: {
    loading: 'Завантаження...',
    title: 'Мої слова',
    summary: (words: number, categories: number) => `${words} слів у ${categories} категоріях`,
    cancel: 'Скасувати',
    select: 'Вибрати',
    moveSelected: 'Перемістити вибрані слова до набору',
    targetSet: 'Цільовий набір',
    createNewSet: 'Створити новий набір',
    unassigned: 'Без набору',
    newSetName: 'Назва нового набору',
    newSetPlaceholder: 'Напр. Контрольна з біології',
    move: (count: number) => `Перемістити (${count})`,
    searchPlaceholder: 'Пошук слів...',
    sets: 'Набори',
    allSets: (count: number) => `Усі набори (${count})`,
    categories: 'Категорії',
    allCategories: 'Усі категорії',
    mastered: 'Вивчені',
    learning: 'В процесі',
    newWords: 'Нові',
    setFallback: 'Набір',
    difficultyEasy: 'Легкі',
    difficultyMedium: 'Середні',
    difficultyHard: 'Складні',
    emptySearch: 'Слів не знайдено',
    emptyCategory: 'Немає слів у цій категорії',
    deleteConfirm: (count: number) => `Ти впевнений, що хочеш видалити ${count} слів?`,
  },
} as const;

type VocabularyCopy = typeof vocabularyCopy.pl;

export default function VocabularyPage() {
  const NEW_SET_OPTION = '__new__';
  const UNASSIGNED_OPTION = '__unassigned__';
  const hydrated = useHydration();
  const language = useLanguage();
  const t = (vocabularyCopy[language] ?? vocabularyCopy.pl) as VocabularyCopy;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedSetFilter, setSelectedSetFilter] = useState<'all' | 'unassigned' | string>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [bulkSetTarget, setBulkSetTarget] = useState(NEW_SET_OPTION);
  const [bulkSetName, setBulkSetName] = useState('');

  const vocabulary = useVocabStore((state) => state.getActiveVocabulary());
  const progress = useVocabStore((state) => state.progress);
  const settings = useVocabStore((state) => state.settings);
  const removeVocabulary = useVocabStore((state) => state.removeVocabulary);
  const sets = useVocabStore((state) => state.getActiveSets());
  const createSet = useVocabStore((state) => state.createSet);
  const replaceWordsSet = useVocabStore((state) => state.replaceWordsSet);

  const setNameById = useMemo(() => {
    const map: Record<string, string> = {};
    sets.forEach((set) => {
      map[set.id] = set.name;
    });
    return map;
  }, [sets]);

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

  const wordsInSet = useMemo(() => {
    if (selectedSetFilter === 'all') return vocabulary;
    if (selectedSetFilter === 'unassigned') {
      return vocabulary.filter((word) => (word.setIds ?? []).length === 0);
    }
    return vocabulary.filter((word) => (word.setIds ?? []).includes(selectedSetFilter));
  }, [selectedSetFilter, vocabulary]);

  const categories = useMemo(
    () => Array.from(new Set(wordsInSet.map((word) => word.category))),
    [wordsInSet]
  );

  // Filter vocabulary
  const filteredVocabulary = wordsInSet.filter((word) => {
    const matchesSearch =
      getTargetText(word).toLowerCase().includes(searchQuery.toLowerCase()) ||
      getNativeText(word).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || word.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedVocabulary = filteredVocabulary.reduce((acc, word) => {
    if (!acc[word.category]) {
      acc[word.category] = [];
    }
    acc[word.category].push(word);
    return acc;
  }, {} as Record<string, VocabularyItem[]>);

  useEffect(() => {
    if (
      selectedSetFilter !== 'all' &&
      selectedSetFilter !== 'unassigned' &&
      !sets.some((set) => set.id === selectedSetFilter)
    ) {
      setSelectedSetFilter('all');
    }
  }, [selectedSetFilter, sets]);

  useEffect(() => {
    if (selectedCategory !== 'all' && !categories.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    if (bulkSetTarget === NEW_SET_OPTION || bulkSetTarget === UNASSIGNED_OPTION) {
      return;
    }
    if (!sets.some((set) => set.id === bulkSetTarget)) {
      setBulkSetTarget(sets.length > 0 ? sets[0].id : NEW_SET_OPTION);
    }
  }, [NEW_SET_OPTION, UNASSIGNED_OPTION, bulkSetTarget, sets]);

  useEffect(() => {
    if (bulkSetTarget !== NEW_SET_OPTION) {
      setBulkSetName('');
    }
  }, [NEW_SET_OPTION, bulkSetTarget]);

  const handleSpeak = async (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!settings.general.sounds) return;
    try {
      await speak(word, {
        voice: settings.pronunciation.voice,
        speed: settings.pronunciation.speed,
        locale: getSpeechLocale(
          settings.learning.targetLanguage,
          settings.pronunciation.voice
        ),
      });
    } catch (error) {
      console.error('TTS error:', error);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleDelete = () => {
    if (selectedItems.size === 0) return;

    if (confirm(t.deleteConfirm(selectedItems.size))) {
      removeVocabulary(Array.from(selectedItems));
      setSelectedItems(new Set());
      setIsSelecting(false);
    }
  };

  const handleStartSelecting = () => {
    setIsSelecting(true);
    if (sets.length > 0) {
      setBulkSetTarget(sets[0].id);
    } else {
      setBulkSetTarget(NEW_SET_OPTION);
    }
  };

  const handleBulkAssign = () => {
    if (selectedItems.size === 0) return;

    let targetSetId: string | null = null;

    if (bulkSetTarget === NEW_SET_OPTION) {
      const label = bulkSetName.trim();
      if (!label) return;
      const newSet = createSet(label);
      targetSetId = newSet.id;
    } else if (bulkSetTarget === UNASSIGNED_OPTION) {
      targetSetId = null;
    } else {
      targetSetId = bulkSetTarget;
    }

    replaceWordsSet(Array.from(selectedItems), targetSetId);
    setSelectedItems(new Set());
    setIsSelecting(false);
    setBulkSetName('');
  };

  const getProgressStatus = (id: string) => {
    const p = progress[id];
    if (!p) return 'new';
    return p.status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mastered':
        return 'bg-success-500';
      case 'learning':
        return 'bg-amber-500';
      default:
        return 'bg-slate-300';
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
    <div className="min-h-screen relative overflow-hidden pb-24">
      {/* Gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-blue-500 to-pink-500 opacity-5 dark:opacity-10" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 left-0 w-80 h-80 bg-pink-500/15 rounded-full blur-3xl" />

      <div className="relative z-10 p-4 space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <button className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
            <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
        </Link>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 via-blue-500 to-pink-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
          <BookOpen size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">
            {t.title}
          </h1>
          <p className="text-sm text-slate-500">
            {t.summary(vocabulary.length, categories.length)}
          </p>
        </div>
        {isSelecting ? (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsSelecting(false);
                setSelectedItems(new Set());
              }}
            >
              {t.cancel}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={selectedItems.size === 0}
            >
              <Trash2 size={16} className="mr-1" />
              {selectedItems.size}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={handleStartSelecting}>
            {t.select}
          </Button>
        )}
      </div>

      {isSelecting && (
        <Card variant="glass">
          <CardContent className="p-4 space-y-3">
            <div className="text-sm font-medium bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">
              {t.moveSelected}
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-slate-500">{t.targetSet}</label>
                <select
                  value={bulkSetTarget}
                  onChange={(e) => setBulkSetTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={NEW_SET_OPTION}>{t.createNewSet}</option>
                  <option value={UNASSIGNED_OPTION}>{t.unassigned}</option>
                  {sets.map((set) => (
                    <option key={set.id} value={set.id}>
                      {set.name}
                    </option>
                  ))}
                </select>
              </div>
              {bulkSetTarget === NEW_SET_OPTION && (
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-slate-500">{t.newSetName}</label>
                  <input
                    type="text"
                    value={bulkSetName}
                    onChange={(e) => setBulkSetName(e.target.value)}
                    placeholder={t.newSetPlaceholder}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}
              <Button
                variant="gradient"
                onClick={handleBulkAssign}
                className="md:w-auto shadow-lg shadow-primary-500/25"
                disabled={
                  selectedItems.size === 0 ||
                  (bulkSetTarget === NEW_SET_OPTION && !bulkSetName.trim())
                }
              >
                {t.move(selectedItems.size)}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search
          size={20}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-primary-100 dark:border-primary-800/50 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
        />
      </div>

      {/* Set filter */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-400">{t.sets}</p>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          <button
            onClick={() => setSelectedSetFilter('all')}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              selectedSetFilter === 'all'
                ? 'bg-gradient-to-r from-primary-500 to-pink-500 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/70'
            )}
          >
            {t.allSets(vocabulary.length)}
          </button>
          <button
            onClick={() => setSelectedSetFilter('unassigned')}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              selectedSetFilter === 'unassigned'
                ? 'bg-gradient-to-r from-primary-500 to-pink-500 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/70'
            )}
          >
            {t.unassigned} ({unassignedCount})
          </button>
          {sets.map((set) => (
            <button
              key={set.id}
              onClick={() => setSelectedSetFilter(set.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                selectedSetFilter === set.id
                  ? 'bg-gradient-to-r from-primary-500 to-pink-500 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/70'
              )}
            >
              {set.name} ({setCounts[set.id] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-400">{t.categories}</p>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-primary-500 to-pink-500 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/70'
            )}
          >
            {t.allCategories}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-primary-500 to-pink-500 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/70'
              )}
            >
              {getCategoryLabel(cat, language)}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-success-500" />
          {t.mastered}
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          {t.learning}
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-slate-300" />
          {t.newWords}
        </div>
      </div>

      {/* Vocabulary list */}
      {Object.entries(groupedVocabulary).map(([category, words]) => (
        <div key={category} className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            <BookOpen size={16} />
            {getCategoryLabel(category, language)} ({words.length})
          </div>

          {words.map((word) => {
            const status = getProgressStatus(word.id);
            const isSelected = selectedItems.has(word.id);

            return (
              <Card
                key={word.id}
                variant="glass"
                className={cn(
                  'transition-all',
                  isSelected && 'ring-2 ring-primary-500 shadow-lg shadow-primary-500/20'
                )}
                onClick={() => isSelecting && toggleSelection(word.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {isSelecting && (
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1',
                          isSelected
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-slate-300 dark:border-slate-600'
                        )}
                      >
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                    )}

                    <div
                      className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0 mt-2',
                        getStatusColor(status)
                      )}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800 dark:text-slate-100">
                          {getTargetText(word)}
                        </p>
                        <span className="text-xs text-slate-400 font-mono">
                          {word.phonetic}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {getNativeText(word)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(word.setIds ?? []).length === 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-500">
                            {t.unassigned}
                          </span>
                        ) : (
                          (word.setIds ?? []).map((setId) => (
                            <span
                              key={setId}
                              className="px-2 py-0.5 rounded-full text-xs bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300"
                            >
                              {setNameById[setId] || t.setFallback}
                            </span>
                          ))
                        )}
                      </div>
                      {getTargetExample(word) && (
                        <p className="text-xs text-slate-400 mt-1 italic truncate">
                          "{getTargetExample(word)}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs',
                          word.difficulty === 'easy'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : word.difficulty === 'medium'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        )}
                      >
                        {word.difficulty === 'easy'
                          ? t.difficultyEasy
                          : word.difficulty === 'medium'
                          ? t.difficultyMedium
                          : t.difficultyHard}
                      </span>

                      <button
                        onClick={(e) => handleSpeak(getTargetText(word), e)}
                        className="p-2 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/30 text-slate-400 hover:text-primary-500 transition-colors"
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}

      {filteredVocabulary.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-100 to-pink-100 dark:from-primary-900/30 dark:to-pink-900/30 flex items-center justify-center">
            <BookOpen size={36} className="text-primary-400" />
          </div>
          <p className="text-slate-500">
            {searchQuery
              ? t.emptySearch
              : t.emptyCategory}
          </p>
        </div>
      )}

      {/* Add button - positioned on left to avoid chatbot */}
      <Link href="/chat">
        <Button variant="gradient" className="fixed bottom-24 left-4 md:left-28 md:bottom-10 rounded-full w-14 h-14 shadow-xl shadow-primary-500/30">
          <Plus size={24} />
        </Button>
      </Link>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  Search,
  Filter,
  Volume2,
  Trash2,
  Plus,
  BookOpen,
  Check,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useVocabStore, useHydration } from '@/lib/store';
import { VocabularyItem } from '@/types';
import { cn, speak } from '@/lib/utils';

export default function VocabularyPage() {
  const hydrated = useHydration();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  const vocabulary = useVocabStore((state) => state.vocabulary);
  const progress = useVocabStore((state) => state.progress);
  const settings = useVocabStore((state) => state.settings);
  const getCategories = useVocabStore((state) => state.getCategories);
  const removeVocabulary = useVocabStore((state) => state.removeVocabulary);

  const categories = getCategories();

  if (!hydrated) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Ładowanie...</p>
      </div>
    );
  }

  // Filter vocabulary
  const filteredVocabulary = vocabulary.filter((word) => {
    const matchesSearch =
      word.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      word.pl.toLowerCase().includes(searchQuery.toLowerCase());
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

  const handleSpeak = async (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await speak(word, {
        voice: settings.pronunciation.voice,
        speed: settings.pronunciation.speed,
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

    if (confirm(`Czy na pewno chcesz usunąć ${selectedItems.size} słówek?`)) {
      removeVocabulary(Array.from(selectedItems));
      setSelectedItems(new Set());
      setIsSelecting(false);
    }
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

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Moje słówka
          </h1>
          <p className="text-sm text-slate-500">
            {vocabulary.length} słówek w {categories.length} kategoriach
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
              Anuluj
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
          <Button variant="ghost" size="sm" onClick={() => setIsSelecting(true)}>
            Wybierz
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={20}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Szukaj słówek..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        <button
          onClick={() => setSelectedCategory('all')}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            selectedCategory === 'all'
              ? 'bg-primary-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          )}
        >
          Wszystkie
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              selectedCategory === cat
                ? 'bg-primary-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-success-500" />
          Opanowane
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          W trakcie
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-slate-300" />
          Nowe
        </div>
      </div>

      {/* Vocabulary list */}
      {Object.entries(groupedVocabulary).map(([category, words]) => (
        <div key={category} className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            <BookOpen size={16} />
            {category} ({words.length})
          </div>

          {words.map((word) => {
            const status = getProgressStatus(word.id);
            const isSelected = selectedItems.has(word.id);

            return (
              <Card
                key={word.id}
                className={cn(
                  'transition-all',
                  isSelected && 'ring-2 ring-primary-500'
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
                          {word.en}
                        </p>
                        <span className="text-xs text-slate-400 font-mono">
                          {word.phonetic}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {word.pl}
                      </p>
                      {word.example_en && (
                        <p className="text-xs text-slate-400 mt-1 italic truncate">
                          "{word.example_en}"
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
                          ? 'Łatwe'
                          : word.difficulty === 'medium'
                          ? 'Średnie'
                          : 'Trudne'}
                      </span>

                      <button
                        onClick={(e) => handleSpeak(word.en, e)}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500"
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
          <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">
            {searchQuery
              ? 'Nie znaleziono słówek'
              : 'Brak słówek w tej kategorii'}
          </p>
        </div>
      )}

      {/* Add button - positioned on left to avoid chatbot */}
      <Link href="/chat">
        <Button className="fixed bottom-20 left-4 rounded-full w-14 h-14 shadow-lg">
          <Plus size={24} />
        </Button>
      </Link>
    </div>
  );
}

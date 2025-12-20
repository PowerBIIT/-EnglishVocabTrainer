import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  VocabularyItem,
  UserProgress,
  AppSettings,
  UserStats,
  Badge,
  QuizResult,
  FlashcardAction,
} from '@/types';
import { sampleVocabulary } from '@/data/vocabulary';

// Default settings
const defaultSettings: AppSettings = {
  session: {
    quizQuestionCount: 10,
    flashcardCount: 10,
    timeLimit: null,
    wordOrder: 'random',
    repeatMistakes: true,
  },
  pronunciation: {
    voice: 'british',
    speed: 0.7,
    autoPlay: false,
    passingScore: 7,
  },
  general: {
    language: 'pl',
    theme: 'auto',
    sounds: true,
    notifications: false,
    offlineMode: false,
  },
  ai: {
    feedbackDetail: 'detailed',
    feedbackLanguage: 'pl',
    phoneticHints: true,
  },
};

// Default stats
const defaultStats: UserStats = {
  totalXp: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  totalWordsLearned: 0,
  totalSessionsCompleted: 0,
  totalTimeSpent: 0,
  lastSessionDate: null,
  badges: [],
};

// XP thresholds for levels
const levelThresholds = [
  0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200, 7600,
  9200, 11000, 13000, 15500, 18500, 22000,
];

interface VocabStore {
  // Vocabulary
  vocabulary: VocabularyItem[];
  addVocabulary: (items: VocabularyItem[]) => void;
  removeVocabulary: (ids: string[]) => void;
  updateVocabulary: (id: string, updates: Partial<VocabularyItem>) => void;

  // Progress
  progress: Record<string, UserProgress>;
  updateProgress: (vocabId: string, correct: boolean) => void;
  updatePronunciationScore: (vocabId: string, score: number) => void;
  getNextReviewWords: (count: number | 'all') => VocabularyItem[];

  // Settings
  settings: AppSettings;
  updateSettings: <K extends keyof AppSettings>(
    category: K,
    updates: Partial<AppSettings[K]>
  ) => void;

  // Stats
  stats: UserStats;
  addXp: (amount: number) => void;
  updateStreak: () => void;
  addBadge: (badge: Badge) => void;
  incrementSessionCount: () => void;

  // Quiz session
  currentQuizResults: QuizResult[];
  addQuizResult: (result: QuizResult) => void;
  clearQuizResults: () => void;

  // Flashcard session
  processFlashcardAction: (vocabId: string, action: FlashcardAction) => void;

  // Utilities
  getCategories: () => string[];
  getVocabularyByCategory: (category: string) => VocabularyItem[];
  getCategorySummary: () => {
    name: string;
    totalWords: number;
    masteredWords: number;
    masteryPercentage: number;
  }[];
}

export const useVocabStore = create<VocabStore>()(
  persist(
    (set, get) => ({
      // Initial state
      vocabulary: sampleVocabulary,
      progress: {},
      settings: defaultSettings,
      stats: defaultStats,
      currentQuizResults: [],

      // Vocabulary actions
      addVocabulary: (items) =>
        set((state) => ({
          vocabulary: [...state.vocabulary, ...items],
        })),

      removeVocabulary: (ids) =>
        set((state) => ({
          vocabulary: state.vocabulary.filter((v) => !ids.includes(v.id)),
          progress: Object.fromEntries(
            Object.entries(state.progress).filter(([key]) => !ids.includes(key))
          ),
        })),

      updateVocabulary: (id, updates) =>
        set((state) => ({
          vocabulary: state.vocabulary.map((v) =>
            v.id === id ? { ...v, ...updates } : v
          ),
        })),

      // Progress actions
      updateProgress: (vocabId, correct) =>
        set((state) => {
          const existing = state.progress[vocabId] || {
            vocab_id: vocabId,
            times_seen: 0,
            times_correct: 0,
            times_wrong: 0,
            avg_pronunciation_score: 0,
            last_seen: new Date(),
            next_review: new Date(),
            status: 'new' as const,
          };

          const times_correct = existing.times_correct + (correct ? 1 : 0);
          const times_wrong = existing.times_wrong + (correct ? 0 : 1);
          const times_seen = existing.times_seen + 1;

          // Calculate next review date based on spaced repetition
          const accuracy = times_correct / times_seen;
          let daysUntilReview = 1;
          if (accuracy >= 0.9) daysUntilReview = 7;
          else if (accuracy >= 0.8) daysUntilReview = 3;
          else if (accuracy >= 0.6) daysUntilReview = 1;

          const next_review = new Date();
          next_review.setDate(next_review.getDate() + daysUntilReview);

          // Determine status
          let status: 'new' | 'learning' | 'mastered' = 'learning';
          if (times_seen >= 5 && accuracy >= 0.8) status = 'mastered';
          else if (times_seen === 0) status = 'new';

          return {
            progress: {
              ...state.progress,
              [vocabId]: {
                ...existing,
                times_seen,
                times_correct,
                times_wrong,
                last_seen: new Date(),
                next_review,
                status,
              },
            },
          };
        }),

      updatePronunciationScore: (vocabId, score) =>
        set((state) => {
          const existing = state.progress[vocabId];
          if (!existing) return state;

          const currentAvg = existing.avg_pronunciation_score;
          const count = existing.times_seen || 1;
          const newAvg = (currentAvg * (count - 1) + score) / count;

          return {
            progress: {
              ...state.progress,
              [vocabId]: {
                ...existing,
                avg_pronunciation_score: newAvg,
              },
            },
          };
        }),

      getNextReviewWords: (count) => {
        const state = get();
        const now = new Date();

        // Get words due for review or new words
        const dueWords = state.vocabulary.filter((v) => {
          const progress = state.progress[v.id];
          if (!progress) return true; // New word
          return new Date(progress.next_review) <= now;
        });

        // Sort by priority: hardest first if setting enabled
        const sorted =
          state.settings.session.wordOrder === 'hardest_first'
            ? dueWords.sort((a, b) => {
                const progA = state.progress[a.id];
                const progB = state.progress[b.id];
                const accA = progA
                  ? progA.times_correct / (progA.times_seen || 1)
                  : 0.5;
                const accB = progB
                  ? progB.times_correct / (progB.times_seen || 1)
                  : 0.5;
                return accA - accB;
              })
            : state.settings.session.wordOrder === 'alphabetical'
            ? dueWords.sort((a, b) => a.en.localeCompare(b.en))
            : dueWords.sort(() => Math.random() - 0.5);

        return count === 'all' ? sorted : sorted.slice(0, count);
      },

      // Settings actions
      updateSettings: (category, updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [category]: {
              ...state.settings[category],
              ...updates,
            },
          },
        })),

      // Stats actions
      addXp: (amount) =>
        set((state) => {
          const newXp = state.stats.totalXp + amount;
          let newLevel = state.stats.level;

          // Calculate new level
          for (let i = levelThresholds.length - 1; i >= 0; i--) {
            if (newXp >= levelThresholds[i]) {
              newLevel = i + 1;
              break;
            }
          }

          return {
            stats: {
              ...state.stats,
              totalXp: newXp,
              level: newLevel,
            },
          };
        }),

      updateStreak: () =>
        set((state) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const lastSession = state.stats.lastSessionDate
            ? new Date(state.stats.lastSessionDate)
            : null;
          if (lastSession) {
            lastSession.setHours(0, 0, 0, 0);
          }

          let newStreak = state.stats.currentStreak;

          if (!lastSession) {
            newStreak = 1;
          } else {
            const diffDays = Math.floor(
              (today.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (diffDays === 0) {
              // Same day, no change
            } else if (diffDays === 1) {
              newStreak += 1;
            } else {
              newStreak = 1; // Streak broken
            }
          }

          return {
            stats: {
              ...state.stats,
              currentStreak: newStreak,
              longestStreak: Math.max(newStreak, state.stats.longestStreak),
              lastSessionDate: new Date(),
            },
          };
        }),

      addBadge: (badge) =>
        set((state) => {
          if (state.stats.badges.some((b) => b.id === badge.id)) {
            return state; // Already has badge
          }
          return {
            stats: {
              ...state.stats,
              badges: [...state.stats.badges, badge],
            },
          };
        }),

      incrementSessionCount: () =>
        set((state) => ({
          stats: {
            ...state.stats,
            totalSessionsCompleted: state.stats.totalSessionsCompleted + 1,
          },
        })),

      // Quiz session actions
      addQuizResult: (result) =>
        set((state) => ({
          currentQuizResults: [...state.currentQuizResults, result],
        })),

      clearQuizResults: () =>
        set({
          currentQuizResults: [],
        }),

      // Flashcard actions
      processFlashcardAction: (vocabId, action) =>
        set((state) => {
          const existing = state.progress[vocabId] || {
            vocab_id: vocabId,
            times_seen: 0,
            times_correct: 0,
            times_wrong: 0,
            avg_pronunciation_score: 0,
            last_seen: new Date(),
            next_review: new Date(),
            status: 'new' as const,
          };

          let daysUntilReview = 1;
          let status = existing.status;

          if (action === 'know') {
            daysUntilReview =
              existing.times_correct >= 4
                ? 14
                : existing.times_correct >= 2
                ? 7
                : 3;
            if (existing.times_correct >= 4) status = 'mastered';
          } else if (action === 'repeat') {
            daysUntilReview = 0; // Will be shown again in same session
            status = 'learning';
          } else if (action === 'hard') {
            daysUntilReview = 1;
            status = 'learning';
          }

          const next_review = new Date();
          next_review.setDate(next_review.getDate() + daysUntilReview);

          return {
            progress: {
              ...state.progress,
              [vocabId]: {
                ...existing,
                times_seen: existing.times_seen + 1,
                times_correct:
                  existing.times_correct + (action === 'know' ? 1 : 0),
                last_seen: new Date(),
                next_review,
                status,
              },
            },
          };
        }),

      // Utility functions
      getCategories: () => {
        const categories = new Set(get().vocabulary.map((v) => v.category));
        return Array.from(categories);
      },

      getVocabularyByCategory: (category) => {
        return get().vocabulary.filter((v) => v.category === category);
      },

      getCategorySummary: () => {
        const state = get();
        const categories = state.getCategories();

        return categories.map((name) => {
          const words = state.vocabulary.filter((v) => v.category === name);
          const masteredWords = words.filter(
            (w) => state.progress[w.id]?.status === 'mastered'
          ).length;

          return {
            name,
            totalWords: words.length,
            masteredWords,
            masteryPercentage:
              words.length > 0
                ? Math.round((masteredWords / words.length) * 100)
                : 0,
          };
        });
      },
    }),
    {
      name: 'vocab-storage',
      partialize: (state) => ({
        vocabulary: state.vocabulary,
        progress: state.progress,
        settings: state.settings,
        stats: state.stats,
      }),
    }
  )
);

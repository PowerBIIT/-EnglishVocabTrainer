import { create } from 'zustand';
import { useEffect, useState } from 'react';
import {
  VocabularyItem,
  AppState,
  UserProgress,
  AppSettings,
  UserStats,
  Badge,
  QuizResult,
  FlashcardAction,
  PronunciationAttempt,
  PronunciationFocusMode,
  PhonemeType,
  PronunciationSessionResult,
  DailyMission,
  StudySet,
} from '@/types';
import { applyMissionReward, createDefaultState, ensureDailyMission, hydrateAppState } from '@/lib/appState';
import { generateId, getLevelProgress } from '@/lib/utils';

const defaultState = createDefaultState();

interface VocabStore {
  // Sync
  isReady: boolean;
  hydrateFromServer: (state: AppState) => void;
  setReady: (ready: boolean) => void;

  // Vocabulary
  vocabulary: VocabularyItem[];
  addVocabulary: (items: VocabularyItem[]) => void;
  removeVocabulary: (ids: string[]) => void;
  updateVocabulary: (id: string, updates: Partial<VocabularyItem>) => void;

  // Sets
  sets: StudySet[];
  createSet: (name: string) => StudySet;
  renameSet: (id: string, name: string) => void;
  deleteSet: (id: string) => void;
  assignWordsToSet: (wordIds: string[], setId: string) => void;
  replaceWordsSet: (wordIds: string[], setId: string | null) => void;

  // Progress
  progress: Record<string, UserProgress>;
  updateProgress: (vocabId: string, correct: boolean) => void;
  updatePronunciationScore: (vocabId: string, score: number) => void;
  getNextReviewWords: (count: number | 'all') => VocabularyItem[];

  // Pronunciation specific
  addPronunciationAttempt: (attempt: PronunciationAttempt) => void;
  getNextPronunciationWords: (
    count: number | 'all',
    focusMode: PronunciationFocusMode,
    targetPhoneme?: PhonemeType,
    setId?: string | 'unassigned'
  ) => VocabularyItem[];
  updatePronunciationStreak: () => void;
  updatePhonemeMastery: (phoneme: PhonemeType, score: number) => void;
  completePronunciationSession: (result: PronunciationSessionResult) => void;
  getPronunciationHistory: (vocabId?: string) => PronunciationAttempt[];
  getWeakPronunciationWords: (limit?: number) => VocabularyItem[];

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

  // Daily mission
  dailyMission: DailyMission;
  updateDailyMissionProgress: (source: DailyMission['type'], amount?: number) => void;

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

export const useVocabStore = create<VocabStore>()((set, get) => ({
  // Initial state
  ...defaultState,
  isReady: false,
  currentQuizResults: [],

  // Sync actions
  hydrateFromServer: (state) =>
    set(() => ({
      ...hydrateAppState(state),
      currentQuizResults: [],
      isReady: true,
    })),
  setReady: (ready) => set(() => ({ isReady: ready })),

      // Vocabulary actions
      addVocabulary: (items) =>
        set((state) => ({
          vocabulary: [
            ...state.vocabulary,
            ...items.map((item) => ({
              ...item,
              setIds: item.setIds ?? [],
            })),
          ],
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

      // Set actions
      createSet: (name) => {
        const trimmed = name.trim() || 'Nowy zestaw';
        const existingNames = new Set(
          get().sets.map((set) => set.name.trim().toLowerCase())
        );

        let finalName = trimmed;
        let suffix = 2;
        while (existingNames.has(finalName.toLowerCase())) {
          finalName = `${trimmed} (${suffix})`;
          suffix += 1;
        }

        const newSet = {
          id: generateId(),
          name: finalName,
          createdAt: new Date(),
        };

        set((state) => ({
          sets: [...state.sets, newSet],
        }));

        return newSet;
      },

      renameSet: (id, name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return state;

          const existingNames = new Set(
            state.sets
              .filter((set) => set.id !== id)
              .map((set) => set.name.trim().toLowerCase())
          );

          let finalName = trimmed;
          let suffix = 2;
          while (existingNames.has(finalName.toLowerCase())) {
            finalName = `${trimmed} (${suffix})`;
            suffix += 1;
          }

          return {
            sets: state.sets.map((set) =>
              set.id === id ? { ...set, name: finalName } : set
            ),
          };
        }),

      deleteSet: (id) =>
        set((state) => ({
          sets: state.sets.filter((set) => set.id !== id),
          vocabulary: state.vocabulary.map((word) => ({
            ...word,
            setIds: (word.setIds ?? []).filter((setId) => setId !== id),
          })),
        })),

      assignWordsToSet: (wordIds, setId) =>
        set((state) => ({
          vocabulary: state.vocabulary.map((word) => {
            if (!wordIds.includes(word.id)) return word;
            const existing = word.setIds ?? [];
            if (existing.includes(setId)) return word;
            return { ...word, setIds: [...existing, setId] };
          }),
        })),
      replaceWordsSet: (wordIds, setId) =>
        set((state) => ({
          vocabulary: state.vocabulary.map((word) => {
            if (!wordIds.includes(word.id)) return word;
            const nextIds = setId ? [setId] : [];
            return { ...word, setIds: nextIds };
          }),
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
            pronunciation_attempts: 0,
            last_seen: new Date(),
            next_review: new Date(),
            status: 'new' as const,
            pronunciationHistory: [],
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

      // Pronunciation specific actions
      addPronunciationAttempt: (attempt) =>
        set((state) => {
          const existing = state.progress[attempt.vocab_id] || {
            vocab_id: attempt.vocab_id,
            times_seen: 0,
            times_correct: 0,
            times_wrong: 0,
            avg_pronunciation_score: 0,
            pronunciation_attempts: 0,
            last_seen: new Date(),
            next_review: new Date(),
            status: 'new' as const,
            pronunciationHistory: [],
          };

          const history = existing.pronunciationHistory || [];
          const newHistory = [...history, attempt].slice(-50); // Keep last 50 attempts
          const attempts = (existing.pronunciation_attempts || 0) + 1;
          const newAvg =
            ((existing.avg_pronunciation_score || 0) * (attempts - 1) + attempt.score) / attempts;

          return {
            progress: {
              ...state.progress,
              [attempt.vocab_id]: {
                ...existing,
                pronunciation_attempts: attempts,
                avg_pronunciation_score: newAvg,
                pronunciationHistory: newHistory,
                last_seen: new Date(),
              },
            },
          };
        }),

      getNextPronunciationWords: (count, focusMode, targetPhoneme, setId) => {
        const state = get();
        let words = [...state.vocabulary];

        if (setId === 'unassigned') {
          words = words.filter((word) => (word.setIds ?? []).length === 0);
        } else if (setId) {
          words = words.filter((word) => (word.setIds ?? []).includes(setId));
        }

        switch (focusMode) {
          case 'weak_words':
            // Sort by lowest pronunciation score
            words = words
              .filter((w) => {
                const prog = state.progress[w.id];
                return prog && prog.pronunciation_attempts > 0;
              })
              .sort((a, b) => {
                const progA = state.progress[a.id];
                const progB = state.progress[b.id];
                return (progA?.avg_pronunciation_score || 0) - (progB?.avg_pronunciation_score || 0);
              });
            break;

          case 'new_words':
            // Words never practiced for pronunciation
            words = words.filter((w) => {
              const prog = state.progress[w.id];
              return !prog || !prog.pronunciation_attempts;
            });
            break;

          case 'phoneme_specific':
            // Filter by words containing target phoneme
            if (targetPhoneme) {
              const phonemePatterns: Record<string, RegExp> = {
                th_voiceless: /th/i,
                th_voiced: /th/i,
                w_sound: /^w|[^o]w/i,
                v_sound: /v/i,
                english_r: /r/i,
                schwa: /[aeiou]/i,
                short_i: /i(?!e)/i,
                long_ee: /ee|ea|ie/i,
                short_u: /oo|u(?!e)/i,
                long_oo: /oo|ue/i,
                ng_sound: /ng|nk/i,
                final_clusters: /(sts|sks|ths)$/i,
              };
              const pattern = phonemePatterns[targetPhoneme];
              if (pattern) {
                words = words.filter((w) => pattern.test(w.en));
              }
            }
            break;

          case 'review':
            // Words that need review based on score
            words = words.filter((w) => {
              const prog = state.progress[w.id];
              return prog && prog.avg_pronunciation_score < state.settings.pronunciation.passingScore;
            });
            break;

          default:
            // Random - shuffle
            words = words.sort(() => Math.random() - 0.5);
        }

        // If adaptive difficulty is on, prioritize medium difficulty
        if (state.settings.pronunciation.adaptiveDifficulty && focusMode !== 'weak_words') {
          words = words.sort((a, b) => {
            const progA = state.progress[a.id];
            const progB = state.progress[b.id];
            const scoreA = progA?.avg_pronunciation_score || 5;
            const scoreB = progB?.avg_pronunciation_score || 5;
            // Prioritize words with score around 5-7 (not too easy, not too hard)
            const diffA = Math.abs(scoreA - 6);
            const diffB = Math.abs(scoreB - 6);
            return diffA - diffB;
          });
        }

        return count === 'all' ? words : words.slice(0, count);
      },

      updatePronunciationStreak: () =>
        set((state) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const lastPronunciation = state.stats.lastPronunciationDate
            ? new Date(state.stats.lastPronunciationDate)
            : null;
          if (lastPronunciation) {
            lastPronunciation.setHours(0, 0, 0, 0);
          }

          let newStreak = state.stats.pronunciationStreak;

          if (!lastPronunciation) {
            newStreak = 1;
          } else {
            const diffDays = Math.floor(
              (today.getTime() - lastPronunciation.getTime()) / (1000 * 60 * 60 * 24)
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
              pronunciationStreak: newStreak,
              longestPronunciationStreak: Math.max(newStreak, state.stats.longestPronunciationStreak),
              lastPronunciationDate: new Date(),
            },
          };
        }),

      updatePhonemeMastery: (phoneme, score) =>
        set((state) => {
          const currentMastery = state.stats.phonemeMastery[phoneme] || 0;
          // Rolling average with more weight on recent scores
          const newMastery = Math.round(currentMastery * 0.7 + (score * 10) * 0.3);

          return {
            stats: {
              ...state.stats,
              phonemeMastery: {
                ...state.stats.phonemeMastery,
                [phoneme]: Math.min(100, newMastery),
              },
            },
          };
        }),

      completePronunciationSession: (result) =>
        set((state) => {
          const totalSessions = state.stats.totalPronunciationSessions + 1;
          const currentAvg = state.stats.averagePronunciationScore;
          const newAvg = (currentAvg * (totalSessions - 1) + result.averageScore) / totalSessions;

          return {
            stats: {
              ...state.stats,
              totalPronunciationSessions: totalSessions,
              averagePronunciationScore: newAvg,
            },
          };
        }),

      getPronunciationHistory: (vocabId) => {
        const state = get();
        if (vocabId) {
          return state.progress[vocabId]?.pronunciationHistory || [];
        }
        // Return all history from all words
        return Object.values(state.progress)
          .flatMap((p) => p.pronunciationHistory || [])
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      },

      getWeakPronunciationWords: (limit = 10) => {
        const state = get();
        return state.vocabulary
          .filter((w) => {
            const prog = state.progress[w.id];
            return prog && prog.pronunciation_attempts > 0 && prog.avg_pronunciation_score < 7;
          })
          .sort((a, b) => {
            const progA = state.progress[a.id];
            const progB = state.progress[b.id];
            return (progA?.avg_pronunciation_score || 0) - (progB?.avg_pronunciation_score || 0);
          })
          .slice(0, limit);
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
          const newLevel = getLevelProgress(newXp).level;

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

      // Daily mission actions
      updateDailyMissionProgress: (source, amount = 1) =>
        set((state) => {
          const mission = ensureDailyMission(state.dailyMission);
          if (mission.completed) {
            return { dailyMission: mission };
          }

          if (mission.type !== source && mission.type !== 'mixed') {
            return { dailyMission: mission };
          }

          const progress = Math.min(mission.target, mission.progress + amount);
          const completed = progress >= mission.target;
          const updatedMission = {
            ...mission,
            progress,
            completed,
          };

          return {
            dailyMission: updatedMission,
            stats: completed
              ? applyMissionReward(state.stats, mission.rewardXp)
              : state.stats,
          };
        }),

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
            pronunciation_attempts: 0,
            last_seen: new Date(),
            next_review: new Date(),
            status: 'new' as const,
            pronunciationHistory: [],
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
}));

// Hook to handle hydration - prevents SSR/client mismatch
export const useHydration = () => {
  const [hydrated, setHydrated] = useState(false);
  const isReady = useVocabStore((state) => state.isReady);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated && isReady;
};

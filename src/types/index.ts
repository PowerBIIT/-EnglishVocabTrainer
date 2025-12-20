// Vocabulary item model
export interface VocabularyItem {
  id: string;
  en: string;
  phonetic: string;
  pl: string;
  category: string;
  example_en?: string;
  example_pl?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  created_at: Date;
  source: 'manual' | 'photo' | 'ai_generated' | 'preset';
}

// User progress for each vocabulary item
export interface UserProgress {
  vocab_id: string;
  times_seen: number;
  times_correct: number;
  times_wrong: number;
  avg_pronunciation_score: number;
  last_seen: Date;
  next_review: Date;
  status: 'new' | 'learning' | 'mastered';
}

// Quiz types
export type QuizMode = 'en_to_pl' | 'pl_to_en' | 'typing' | 'listening' | 'mixed';

export interface QuizQuestion {
  id: string;
  vocabItem: VocabularyItem;
  mode: QuizMode;
  options?: string[];
  correctAnswer: string;
}

export interface QuizResult {
  questionId: string;
  vocabId: string;
  correct: boolean;
  userAnswer: string;
  timeSpent?: number;
}

// Session settings
export interface SessionSettings {
  quizQuestionCount: 5 | 10 | 15 | 20 | 'all';
  flashcardCount: 5 | 10 | 15 | 20 | 'all';
  timeLimit: null | 5 | 10 | 15 | 30;
  wordOrder: 'random' | 'alphabetical' | 'hardest_first';
  repeatMistakes: boolean;
}

// Pronunciation settings
export interface PronunciationSettings {
  voice: 'british' | 'american' | 'australian';
  speed: 0.7 | 1 | 1.2;
  autoPlay: boolean;
  passingScore: 5 | 6 | 7 | 8;
}

// General settings
export interface GeneralSettings {
  language: 'pl' | 'en';
  theme: 'light' | 'dark' | 'auto';
  sounds: boolean;
  notifications: boolean;
  notificationTime?: string;
  offlineMode: boolean;
}

// AI settings
export interface AISettings {
  feedbackDetail: 'short' | 'detailed';
  feedbackLanguage: 'pl' | 'en';
  phoneticHints: boolean;
}

// All settings combined
export interface AppSettings {
  session: SessionSettings;
  pronunciation: PronunciationSettings;
  general: GeneralSettings;
  ai: AISettings;
}

// User stats
export interface UserStats {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalWordsLearned: number;
  totalSessionsCompleted: number;
  totalTimeSpent: number;
  lastSessionDate: Date | null;
  badges: Badge[];
}

// Badge types
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
}

// Predefined badge types
export type BadgeType =
  | 'streak_7'
  | 'streak_30'
  | 'perfectionist'
  | 'speaker'
  | 'collector_100'
  | 'collector_500'
  | 'category_master';

// XP actions
export interface XpAction {
  type: 'correct_answer' | 'correct_with_timer' | 'streak_5' | 'streak_10' | 'pronunciation_good' | 'session_complete' | 'daily_streak';
  xp: number;
}

// Flashcard swipe action
export type FlashcardAction = 'know' | 'repeat' | 'hard';

// Category summary
export interface CategorySummary {
  name: string;
  totalWords: number;
  masteredWords: number;
  learningWords: number;
  newWords: number;
  masteryPercentage: number;
}

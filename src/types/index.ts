export type NativeLanguage = 'pl' | 'de' | 'uk';
export type TargetLanguage = 'en' | 'pl';
export type LearningPairId = 'pl-en' | 'de-en' | 'uk-pl';
export type FeedbackLanguage = 'pl' | 'en' | 'de' | 'uk';

export interface LearningSettings {
  nativeLanguage: NativeLanguage;
  targetLanguage: TargetLanguage;
  pairId: LearningPairId;
}

// Vocabulary item model
export interface VocabularyItem {
  id: string;
  en: string;
  phonetic: string;
  pl: string;
  category: string;
  setIds?: string[];
  example_en?: string;
  example_pl?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  created_at: Date;
  source: 'manual' | 'photo' | 'ai_generated' | 'preset';
  languagePair: LearningPairId;
}

export interface StudySet {
  id: string;
  name: string;
  createdAt: Date;
  languagePair: LearningPairId;
}

// Pronunciation attempt history
export interface PronunciationAttempt {
  id: string;
  vocab_id: string;
  timestamp: Date;
  score: number;
  recognizedText: string;
  expectedWord: string;
  errorPhonemes?: string[];
  aiTip?: string;
  phonemeType?: PhonemeType;
}

// Phoneme types for Polish learners
export type PhonemeType =
  | 'th_voiceless'    // /θ/ - think, bath
  | 'th_voiced'       // /ð/ - this, that
  | 'w_sound'         // /w/ - water, wine (vs Polish 'v')
  | 'v_sound'         // /v/ - very, voice
  | 'english_r'       // /r/ - red, very (vs Polish rolled r)
  | 'schwa'           // /ə/ - about, the
  | 'short_i'         // /ɪ/ - ship, bit
  | 'long_ee'         // /iː/ - sheep, beat
  | 'short_u'         // /ʊ/ - full, book
  | 'long_oo'         // /uː/ - fool, boot
  | 'ng_sound'        // /ŋ/ - sing, thing
  | 'final_clusters'; // -sts, -sks, -ths

// User progress for each vocabulary item
export interface UserProgress {
  vocab_id: string;
  times_seen: number;
  times_correct: number;
  times_wrong: number;
  avg_pronunciation_score: number;
  pronunciation_attempts: number;
  last_seen: Date;
  next_review: Date;
  status: 'new' | 'learning' | 'mastered';
  pronunciationHistory?: PronunciationAttempt[];
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

// Pronunciation focus mode
export type PronunciationFocusMode =
  | 'random'           // losowe słowa
  | 'weak_words'       // słowa z niskim wynikiem wymowy
  | 'new_words'        // nowe słowa
  | 'phoneme_specific' // ćwiczenie konkretnego fonemu
  | 'review';          // słowa do powtórki

// Pronunciation settings
export interface PronunciationSettings {
  voice: 'british' | 'american' | 'australian';
  speed: 0.7 | 1 | 1.2;
  autoPlay: boolean;
  passingScore: 5 | 6 | 7 | 8;
  sessionLength: 5 | 10 | 15 | 20 | 'all';
  focusMode: PronunciationFocusMode;
  targetPhoneme?: PhonemeType;
  adaptiveDifficulty: boolean;
  showPhonemeHints: boolean;
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
  feedbackLanguage: FeedbackLanguage;
  phoneticHints: boolean;
}

// All settings combined
export interface AppSettings {
  session: SessionSettings;
  pronunciation: PronunciationSettings;
  general: GeneralSettings;
  ai: AISettings;
  learning: LearningSettings;
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
  // Pronunciation specific stats
  pronunciationStreak: number;
  longestPronunciationStreak: number;
  totalPronunciationSessions: number;
  averagePronunciationScore: number;
  phonemeMastery: Partial<Record<PhonemeType, number>>; // 0-100% mastery per phoneme
  lastPronunciationDate: Date | null;
}

// Daily mission types
export type MissionType = 'flashcards' | 'quiz' | 'pronunciation' | 'mixed';

export interface DailyMission {
  id: string;
  date: string;
  type: MissionType;
  title: string;
  description: string;
  target: number;
  progress: number;
  rewardXp: number;
  completed: boolean;
}

// App state stored per user
export interface AppState {
  vocabulary: VocabularyItem[];
  sets: StudySet[];
  progress: Record<string, UserProgress>;
  settings: AppSettings;
  stats: UserStats;
  dailyMission: DailyMission;
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

// Phoneme drill structure
export interface PhonemeDrill {
  id: string;
  phonemeType: PhonemeType;
  phonemeSymbol: string;        // IPA symbol: /θ/, /ð/, etc.
  nameEn: string;               // "voiceless th"
  namePl: string;               // "bezdźwięczne th"
  polishEquivalent?: string;    // closest Polish sound if any
  polishEquivalentEn?: string;  // description in English
  commonMistake: string;        // Polish explanation
  commonMistakeEn: string;      // English explanation
  instructionPl: string;        // how to make the sound (PL)
  instructionEn: string;        // how to make the sound (EN)
  mouthTip: string;             // position of tongue, lips (PL)
  mouthTipEn: string;           // position of tongue, lips (EN)
  minimalPairs: MinimalPair[];  // pairs to practice
  practiceWords: DrillWord[];   // words to practice
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface MinimalPair {
  word1: string;
  phonetic1: string;
  word2: string;
  phonetic2: string;
  meaningPl1: string;
  meaningPl2: string;
}

export interface DrillWord {
  word: string;
  phonetic: string;
  meaningPl: string;
  phonemePosition: 'initial' | 'medial' | 'final';
}

// Pronunciation session result
export interface PronunciationSessionResult {
  sessionId: string;
  startedAt: Date;
  completedAt: Date;
  focusMode: PronunciationFocusMode;
  targetPhoneme?: PhonemeType;
  totalWords: number;
  averageScore: number;
  attempts: PronunciationAttempt[];
  xpEarned: number;
}

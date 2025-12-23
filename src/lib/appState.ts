import { generateId, getLevelProgress } from '@/lib/utils';
import { getLearningPair, normalizePairId } from '@/lib/languages';
import type {
  AppSettings,
  DailyMission,
  StudySet,
  UserProgress,
  UserStats,
  VocabularyItem,
} from '@/types';

type MissionType = DailyMission['type'];

const missionTemplates: Array<{
  type: MissionType;
  title: string;
  description: string;
  target: number;
  rewardXp: number;
}> = [
  {
    type: 'flashcards',
    title: 'Szybki trening fiszek',
    description: 'Oznacz 5 fiszek jako umiem.',
    target: 5,
    rewardXp: 40,
  },
  {
    type: 'quiz',
    title: 'Celny quiz',
    description: 'Zdobądź 5 poprawnych odpowiedzi.',
    target: 5,
    rewardXp: 40,
  },
  {
    type: 'pronunciation',
    title: 'Wyraźna wymowa',
    description: 'Zalicz 4 dobre próby wymowy.',
    target: 4,
    rewardXp: 50,
  },
  {
    type: 'mixed',
    title: 'Misja mieszana',
    description: 'Zdobądź 6 postępów w dowolnym trybie.',
    target: 6,
    rewardXp: 60,
  },
];

export const defaultSettings: AppSettings = {
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
    sessionLength: 10,
    focusMode: 'random',
    targetPhoneme: undefined,
    adaptiveDifficulty: true,
    showPhonemeHints: true,
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
  learning: {
    nativeLanguage: 'pl',
    targetLanguage: 'en',
    pairId: 'pl-en',
  },
};

export const defaultStats: UserStats = {
  totalXp: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  totalWordsLearned: 0,
  totalSessionsCompleted: 0,
  totalTimeSpent: 0,
  lastSessionDate: null,
  badges: [],
  pronunciationStreak: 0,
  longestPronunciationStreak: 0,
  totalPronunciationSessions: 0,
  averagePronunciationScore: 0,
  phonemeMastery: {},
  lastPronunciationDate: null,
};

const formatDateKey = (date: Date) => date.toISOString().slice(0, 10);

export function createDailyMission(date: Date = new Date()): DailyMission {
  const seed = Number(date.toISOString().slice(0, 10).replace(/-/g, ''));
  const template = missionTemplates[seed % missionTemplates.length];

  return {
    id: `${formatDateKey(date)}-${template.type}-${generateId()}`,
    date: formatDateKey(date),
    type: template.type,
    title: template.title,
    description: template.description,
    target: template.target,
    progress: 0,
    rewardXp: template.rewardXp,
    completed: false,
  };
}

export function ensureDailyMission(mission?: DailyMission | null): DailyMission {
  const todayKey = formatDateKey(new Date());
  if (!mission || mission.date !== todayKey) {
    return createDailyMission();
  }
  return mission;
}

export interface AppState {
  vocabulary: VocabularyItem[];
  sets: StudySet[];
  progress: Record<string, UserProgress>;
  settings: AppSettings;
  stats: UserStats;
  dailyMission: DailyMission;
}

export function createDefaultState(): AppState {
  return {
    vocabulary: [],
    sets: [],
    progress: {},
    settings: defaultSettings,
    stats: defaultStats,
    dailyMission: createDailyMission(),
  };
}

const toDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
};

export function hydrateAppState(raw: AppState): AppState {
  const mergedSettings: AppSettings = {
    ...defaultSettings,
    ...raw.settings,
    session: {
      ...defaultSettings.session,
      ...raw.settings?.session,
    },
    pronunciation: {
      ...defaultSettings.pronunciation,
      ...raw.settings?.pronunciation,
    },
    general: {
      ...defaultSettings.general,
      ...raw.settings?.general,
    },
    ai: {
      ...defaultSettings.ai,
      ...raw.settings?.ai,
    },
    learning: {
      ...defaultSettings.learning,
      ...raw.settings?.learning,
    },
  };

  const normalizedPairId = normalizePairId(
    mergedSettings.learning?.pairId
  );
  const activePair = getLearningPair(normalizedPairId);

  const generalLanguage =
    mergedSettings.general.language === 'pl' ||
    mergedSettings.general.language === 'en' ||
    mergedSettings.general.language === 'uk'
      ? mergedSettings.general.language
      : activePair.uiLanguage;

  const feedbackLanguage = ['pl', 'en', 'de', 'uk'].includes(mergedSettings.ai.feedbackLanguage)
    ? mergedSettings.ai.feedbackLanguage
    : activePair.feedbackLanguage;

  const settings: AppSettings = {
    ...mergedSettings,
    general: {
      ...mergedSettings.general,
      language: generalLanguage,
    },
    ai: {
      ...mergedSettings.ai,
      feedbackLanguage,
    },
    learning: {
      nativeLanguage: activePair.native,
      targetLanguage: activePair.target,
      pairId: activePair.id,
    },
  };

  const vocabulary = raw.vocabulary.map((item) => ({
    ...item,
    created_at: toDate(item.created_at) ?? new Date(),
    setIds: item.setIds ?? [],
  }));

  const sets = (raw.sets ?? []).map((set) => ({
    ...set,
    createdAt: toDate(set.createdAt) ?? new Date(),
  }));

  const progress = Object.fromEntries(
    Object.entries(raw.progress || {}).map(([key, value]) => [
      key,
      {
        ...value,
        last_seen: toDate(value.last_seen) ?? new Date(),
        next_review: toDate(value.next_review) ?? new Date(),
        pronunciationHistory: value.pronunciationHistory?.map((attempt) => ({
          ...attempt,
          timestamp: toDate(attempt.timestamp) ?? new Date(),
        })),
      },
    ])
  );

  const stats = {
    ...raw.stats,
    lastSessionDate: toDate(raw.stats.lastSessionDate),
    lastPronunciationDate: toDate(raw.stats.lastPronunciationDate),
    badges: raw.stats.badges?.map((badge) => ({
      ...badge,
      earnedAt: toDate(badge.earnedAt) ?? new Date(),
    })) ?? [],
  };

  return {
    ...raw,
    vocabulary,
    sets,
    progress,
    stats,
    settings,
    dailyMission: ensureDailyMission(raw.dailyMission),
  };
}

export function applyMissionReward(stats: UserStats, rewardXp: number): UserStats {
  const newXp = stats.totalXp + rewardXp;
  const level = getLevelProgress(newXp).level;

  return {
    ...stats,
    totalXp: newXp,
    level,
  };
}

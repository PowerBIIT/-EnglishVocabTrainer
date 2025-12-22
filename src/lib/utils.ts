import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatDate(date: Date, locale: string = 'pl-PL'): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// XP required for each level
export const levelThresholds = [
  0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200, 7600,
  9200, 11000, 13000, 15500, 18500, 22000,
];

export function getLevelProgress(xp: number): {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  percentage: number;
} {
  let level = 1;
  for (let i = levelThresholds.length - 1; i >= 0; i--) {
    if (xp >= levelThresholds[i]) {
      level = i + 1;
      break;
    }
  }

  const currentLevelXp = levelThresholds[level - 1] || 0;
  const nextLevelXp = levelThresholds[level] || levelThresholds[level - 1] + 1000;
  const currentXp = xp - currentLevelXp;
  const neededXp = nextLevelXp - currentLevelXp;
  const percentage = Math.min(100, Math.round((currentXp / neededXp) * 100));

  return {
    level,
    currentXp,
    nextLevelXp: neededXp,
    percentage,
  };
}

// TTS utility using Web Speech API
export function speak(
  text: string,
  options: {
    voice?: 'british' | 'american' | 'australian';
    speed?: number;
    locale?: string;
  } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.speed || 1;
    const voices = speechSynthesis.getVoices();
    let voiceLang = options.locale || 'en-GB';

    if (voiceLang.startsWith('en')) {
      if (options.voice === 'american') voiceLang = 'en-US';
      else if (options.voice === 'australian') voiceLang = 'en-AU';
      else voiceLang = 'en-GB';
    }

    utterance.lang = voiceLang;

    const voice = voices.find((v) => v.lang.startsWith(voiceLang));
    if (voice) utterance.voice = voice;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);

    speechSynthesis.speak(utterance);
  });
}

// Distractor generation for quiz
export function getDistractors(
  correctAnswer: string,
  allOptions: string[],
  count: number = 3
): string[] {
  const filtered = allOptions.filter((opt) => opt !== correctAnswer);
  return shuffleArray(filtered).slice(0, count);
}

// XP actions
export const XP_ACTIONS = {
  correct_answer: 10,
  correct_with_timer: 15,
  streak_5: 25,
  streak_10: 50,
  pronunciation_good: 20,
  session_complete: 30,
  daily_streak: 50,
} as const;

// Badge definitions
export const BADGES = {
  streak_7: {
    id: 'streak_7',
    name: 'Seria 7 dni',
    nameEn: '7-day streak',
    nameUk: 'Серія 7 днів',
    description: 'Tydzień nauki bez przerwy!',
    descriptionEn: 'A full week of learning without a break!',
    descriptionUk: 'Тиждень навчання без перерви!',
    icon: 'flame',
  },
  streak_30: {
    id: 'streak_30',
    name: 'Seria 30 dni',
    nameEn: '30-day streak',
    nameUk: 'Серія 30 днів',
    description: 'Miesiąc codziennej nauki!',
    descriptionEn: 'A month of daily learning!',
    descriptionUk: 'Місяць щоденного навчання!',
    icon: 'sparkles',
  },
  perfectionist: {
    id: 'perfectionist',
    name: 'Perfekcjonista',
    nameEn: 'Perfectionist',
    nameUk: 'Перфекціоніст',
    description: '100% w quizie (min. 10 pytań)',
    descriptionEn: '100% in a quiz (min. 10 questions)',
    descriptionUk: '100% у квізі (мін. 10 питань)',
    icon: 'target',
  },
  speaker: {
    id: 'speaker',
    name: 'Mówca',
    nameEn: 'Speaker',
    nameUk: 'Мовець',
    description: '10 słówek z wymową > 9/10',
    descriptionEn: '10 words with pronunciation > 9/10',
    descriptionUk: '10 слів із вимовою > 9/10',
    icon: 'mic',
  },
  collector_100: {
    id: 'collector_100',
    name: 'Kolekcjoner',
    nameEn: 'Collector',
    nameUk: 'Колекціонер',
    description: '100 słówek w bibliotece',
    descriptionEn: '100 words in your library',
    descriptionUk: '100 слів у бібліотеці',
    icon: 'book-open',
  },
  category_master: {
    id: 'category_master',
    name: 'Mistrz kategorii',
    nameEn: 'Category master',
    nameUk: 'Майстер категорій',
    description: '100% opanowania kategorii',
    descriptionEn: '100% mastery of a category',
    descriptionUk: '100% опанування категорії',
    icon: 'trophy',
  },
} as const;

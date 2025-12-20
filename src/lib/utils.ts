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

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
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
  options: { voice?: 'british' | 'american' | 'australian'; speed?: number } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.speed || 1;
    utterance.lang = 'en-GB'; // Default to British

    // Try to find the right voice
    const voices = speechSynthesis.getVoices();
    let voiceLang = 'en-GB';
    if (options.voice === 'american') voiceLang = 'en-US';
    else if (options.voice === 'australian') voiceLang = 'en-AU';

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
    description: 'Tydzień nauki bez przerwy!',
    icon: '🔥',
  },
  streak_30: {
    id: 'streak_30',
    name: 'Seria 30 dni',
    description: 'Miesiąc codziennej nauki!',
    icon: '🌟',
  },
  perfectionist: {
    id: 'perfectionist',
    name: 'Perfekcjonista',
    description: '100% w quizie (min. 10 pytań)',
    icon: '🎯',
  },
  speaker: {
    id: 'speaker',
    name: 'Mówca',
    description: '10 słówek z wymową > 9/10',
    icon: '🎤',
  },
  collector_100: {
    id: 'collector_100',
    name: 'Kolekcjoner',
    description: '100 słówek w bibliotece',
    icon: '📚',
  },
  category_master: {
    id: 'category_master',
    name: 'Mistrz kategorii',
    description: '100% opanowania kategorii',
    icon: '🏆',
  },
} as const;

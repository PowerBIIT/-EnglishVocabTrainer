import type { DailyMission } from '@/types';
import type { AppLanguage } from '@/lib/i18n';

const missionCopy = {
  pl: {
    flashcards: {
      title: 'Szybki trening fiszek',
      description: 'Oznacz 5 fiszek jako umiem.',
    },
    quiz: {
      title: 'Celny quiz',
      description: 'Zdobądź 5 poprawnych odpowiedzi.',
    },
    pronunciation: {
      title: 'Wyraźna wymowa',
      description: 'Zalicz 4 dobre próby wymowy.',
    },
    mixed: {
      title: 'Misja mieszana',
      description: 'Zdobądź 6 postępów w dowolnym trybie.',
    },
  },
  en: {
    flashcards: {
      title: 'Flashcard Sprint',
      description: 'Mark 5 flashcards as "I know".',
    },
    quiz: {
      title: 'Sharp Quiz',
      description: 'Get 5 correct answers.',
    },
    pronunciation: {
      title: 'Clear Pronunciation',
      description: 'Score 4 strong pronunciation attempts.',
    },
    mixed: {
      title: 'Mixed Mission',
      description: 'Earn 6 progress points in any mode.',
    },
  },
  uk: {
    flashcards: {
      title: 'Швидкий ривок із флешкартами',
      description: 'Познач 5 карток як "Знаю".',
    },
    quiz: {
      title: 'Точний квіз',
      description: 'Дай 5 правильних відповідей.',
    },
    pronunciation: {
      title: 'Чітка вимова',
      description: 'Отримай 4 вдалі спроби вимови.',
    },
    mixed: {
      title: 'Змішана місія',
      description: 'Набери 6 прогресів у будь-якому режимі.',
    },
  },
} as const;

export const getMissionCopy = (language: AppLanguage, type: DailyMission['type']) =>
  missionCopy[language]?.[type] ?? missionCopy.pl[type];

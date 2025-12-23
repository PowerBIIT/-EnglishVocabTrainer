'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  X,
  Plus,
  Loader2,
  Image as ImageIcon,
  FileText,
  Send,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useVocabStore } from '@/lib/store';
import { useLanguage } from '@/lib/i18n';
import { cn, formatDate, generateId } from '@/lib/utils';
import { parseVocabularyInput } from '@/lib/parseVocabulary';
import { getCategoryLabel } from '@/lib/categories';
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB } from '@/lib/apiLimits';
import {
  getLanguageLabel,
  getLearningPair,
  LEARNING_PAIR_SAMPLES,
} from '@/lib/languages';
import type { LearningPairId, VocabularyItem } from '@/types';

const NEW_SET_OPTION = '__new__';
const SUPPORTED_FILE_EXTENSIONS = ['txt', 'csv', 'pdf', 'docx'];
const SUPPORTED_FILE_MIME = [
  'text/plain',
  'text/csv',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const normalizeForMatch = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9\u0400-\u04ff]+/g, '');

const hasLooseMatch = (value: string, needle: string) => {
  let index = 0;
  for (const char of needle) {
    index = value.indexOf(char, index);
    if (index === -1) return false;
    index += 1;
  }
  return true;
};

const containsKeyword = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.includes(keyword) || hasLooseMatch(value, keyword));

const GENERATION_VERBS = [
  'wygeneruj',
  'wygenerowac',
  'generuj',
  'generate',
  'create',
  'podaj',
  'daj',
  'stworz',
  'zgenery',
  'zrob',
  'згенеруй',
  'створи',
  'створити',
  'зроби',
  'дай',
  'підбери',
  'сгенерируй',
  'создай',
].map(normalizeForMatch);

const GENERATION_NOUNS = [
  'slowa',
  'slowka',
  'slowek',
  'words',
  'vocab',
  'слова',
  'слів',
  'лексика',
].map(normalizeForMatch);

const TOPIC_HINTS = ['temat', 'tema', 'topic', 'тема', 'тематика'].map(normalizeForMatch);

const LANGUAGE_HINTS = [
  'angiel',
  'english',
  'niem',
  'german',
  'deutsch',
  'polsk',
  'polish',
  'ukrain',
  'англ',
  'німець',
  'польсь',
  'україн',
].map(normalizeForMatch);

const stripTopicLanguage = (topic: string) =>
  topic
    .replace(
      /\b(po|w)\s+(j[eę]zyku\s+)?(angielsk\w*|polsk\w*|niem\w*|ukrai[nń]sk\w*)\b/gi,
      ''
    )
    .replace(/\bin\s+(english|german|polish|ukrainian)\b/gi, '')
    .replace(/(?:^|\s)(англ\w*|німецьк\w*|польськ\w*|українськ\w*)(?=\s|$)/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;:–-]+|[\s,;:–-]+$/g, '')
    .trim();

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ParsedWord {
  target: string;
  phonetic: string;
  native: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  example_target?: string;
  example_native?: string;
  selected: boolean;
}

const normalizeParsedWord = (
  word: Partial<ParsedWord>
): Omit<ParsedWord, 'selected'> => ({
  target: word.target ?? '',
  native: word.native ?? '',
  phonetic: word.phonetic ?? '',
  difficulty: word.difficulty ?? 'medium',
  example_target: word.example_target,
  example_native: word.example_native,
});

const FALLBACK_WORDS: Record<LearningPairId, Omit<ParsedWord, 'selected'>[]> = {
  'pl-en': [
    { target: 'example', phonetic: '/ɪɡˈzɑːmpl/', native: 'przykład' },
    { target: 'word', phonetic: '/wɜːd/', native: 'słowo' },
    { target: 'learn', phonetic: '/lɜːn/', native: 'uczyć się' },
  ],
  'de-en': [
    { target: 'example', phonetic: '/ɪɡˈzɑːmpl/', native: 'Beispiel' },
    { target: 'word', phonetic: '/wɜːd/', native: 'Wort' },
    { target: 'learn', phonetic: '/lɜːn/', native: 'lernen' },
  ],
  'uk-pl': [
    { target: 'przykład', phonetic: '', native: 'приклад' },
    { target: 'słowo', phonetic: '', native: 'слово' },
    { target: 'uczyć się', phonetic: '', native: 'вчитися' },
  ],
  'uk-en': [
    { target: 'school', phonetic: '/skuːl/', native: 'школа' },
    { target: 'friend', phonetic: '/frend/', native: 'друг' },
    { target: 'learn', phonetic: '/lɜːn/', native: 'вчитися' },
  ],
  'uk-de': [
    { target: 'Schule', phonetic: '', native: 'школа' },
    { target: 'Freund', phonetic: '', native: 'друг' },
    { target: 'lernen', phonetic: '', native: 'вчитися' },
  ],
};

export const wordIntakeCopy = {
  pl: {
    loading: 'Ładowanie...',
    welcomeMessage: (example: string) =>
      `Witaj! Jestem Twoim asystentem AI do nauki słówek. Mogę:\n\n• Dodać słówka, które wpiszesz (np. "${example}")\n• Wygenerować słówka na temat\n• Wyciągnąć słówka ze zdjęcia lub pliku\n• Pokazać statystyki Twojej biblioteki\n\nJak mogę Ci pomóc?`,
    defaultCategory: 'Moje słówka',
    defaultSetLabel: 'Nowy zestaw',
    defaultTopic: 'ogólne',
    imageCategoryFallback: 'Ze zdjęcia',
    statsIntro: (wordCount: number, categoryCount: number) =>
      `Masz łącznie **${wordCount}** słówek w **${categoryCount}** kategoriach:\n\n`,
    statsLine: (label: string, count: number) => `• ${label}: ${count} słówek`,
    statsOutro: 'Chcesz dodać więcej słówek?',
    generatedWords: (count: number, topic: string, level: string) =>
      `Wygenerowałem **${count}** słówek na temat "${topic}" (poziom ${level}).\n\nZaznacz te, które chcesz dodać do biblioteki:`,
    unsafeTopic:
      'Nie mogę wygenerować słówek dla tego tematu. Wybierz neutralny, szkolny temat (np. szkoła, praca, podróże).',
    clarifyTopic:
      'Temat jest zbyt ogólny. Doprecyzuj, np. "zakupy w sklepie" lub "praca w biurze".',
    generatedFallback: (count: number, total: number, code?: string) =>
      `Użyłem lokalnych danych (brak lub nieprawidłowy klucz API${code ? `, ${code}` : ''}).\n\nZnalazłem ${Math.min(count, total)} przykładowych słówek. Skonfiguruj GEMINI_API_KEY w .env.local dla pełnej funkcjonalności.`,
    generatedFallbackLimit: (count: number, total: number, code?: string) =>
      `Użyłem lokalnych danych (limit AI${code ? `, ${code}` : ''}).\n\nZnalazłem ${Math.min(count, total)} przykładowych słówek.`,
    generatedFallbackError: (count: number, total: number, code?: string) =>
      `Użyłem lokalnych danych (błąd AI${code ? `, ${code}` : ''}).\n\nZnalazłem ${Math.min(count, total)} przykładowych słówek.`,
    foundWordsWithPhonetics: (count: number) =>
      `Znalazłem **${count}** słówek. Dodałem poprawne transkrypcje fonetyczne.\n\nZaznacz te, które chcesz dodać:`,
    foundWords: (count: number) =>
      `Znalazłem **${count}** słówek. Zaznacz te, które chcesz dodać:`,
    parseHelp:
      'Nie rozpoznałem słówek. Spróbuj wpisać w formacie:\n\n• `słowo - tłumaczenie`\n• `word1 - translation1, word2 - translation2`\n\nLub napisz: **"Temat: księgowość, 10 słówek (A2)"**',
    imageUploaded: (fileName: string) => `Przesłano zdjęcie: ${fileName}`,
    imageFound: (count: number, notes?: string) =>
      `Znalazłem **${count}** słówek na zdjęciu.\n\n${notes ? `Uwagi: ${notes}\n\n` : ''}Zaznacz te, które chcesz dodać:`,
    imageNoWords: (target: string, native: string) =>
      `Nie udało się rozpoznać słówek na zdjęciu. Upewnij się, że notatki są czytelne i zawierają słówka ${target.toLowerCase()} z tłumaczeniami ${native.toLowerCase()}.`,
    imageError:
      'Nie udało się przetworzyć zdjęcia. Spróbuj ponownie lub sprawdź konfigurację AI.',
    fileUploaded: (fileName: string) => `Wczytano plik: ${fileName}`,
    fileFound: (count: number, notes?: string) =>
      `Znalazłem **${count}** słówek w pliku.\n\n${notes ? `Uwagi: ${notes}\n\n` : ''}Zaznacz te, które chcesz dodać:`,
    fileNoWords: (target: string, native: string) =>
      `Nie udało się rozpoznać słówek w pliku. Upewnij się, że plik zawiera słówka ${target.toLowerCase()} z tłumaczeniami ${native.toLowerCase()}.`,
    fileError:
      'Nie udało się przetworzyć pliku. Spróbuj ponownie lub sprawdź konfigurację AI.',
    fileTooLarge: (maxSize: number) =>
      `Plik jest za duży. Maksymalny rozmiar to ${maxSize} MB.`,
    fileTypeUnsupported:
      'Nieobsługiwany format pliku. Użyj TXT, PDF, DOCX lub CSV.',
    fileSupportHint: (maxSize: number) =>
      `Obsługiwane: TXT, PDF, DOCX, CSV (do ${maxSize} MB).`,
    fileReadError: 'Nie udało się wczytać pliku.',
    aiLimitReached:
      'Wykorzystałeś limit AI na ten miesiąc. Poczekaj na odnowienie limitu lub przejdź na plan Pro.',
    aiGlobalLimitReached:
      'Globalny limit AI został osiągnięty. Spróbuj ponownie później.',
    aiRateLimited: 'AI jest chwilowo przeciążone. Spróbuj ponownie za chwilę.',
    aiConfigError: 'Błąd konfiguracji AI. Sprawdź GEMINI_API_KEY w .env.local.',
    aiServiceError: 'Wystąpił błąd usługi AI. Spróbuj ponownie później.',
    aiWaitlisted:
      'Twoje konto oczekuje na aktywację. AI będzie dostępne po przyznaniu dostępu.',
    aiSuspended:
      'Twoje konto jest tymczasowo zawieszone. Skontaktuj się z administratorem.',
    addedWords: (count: number, setName: string, category: string) =>
      `Dodano **${count}** słówek do zestawu "${setName}" w kategorii "${category}".\n\nCo jeszcze mogę dla Ciebie zrobić?`,
    setLabel: 'Zestaw:',
    newSetOption: 'Utwórz nowy zestaw',
    setNameLabel: 'Nazwa:',
    setNamePlaceholder: 'Nazwa zestawu',
    categoryLabel: 'Kategoria:',
    categoryPlaceholder: 'Nazwa kategorii',
    selectedCount: (count: number) => `Wybrano: ${count}`,
    cancel: 'Anuluj',
    add: (count: number) => `Dodaj (${count})`,
    addOnboarding: (count: number) => `Dodaj i przejdź dalej (${count})`,
    processing: 'Przetwarzam...',
    quickActionsLabel: 'Szybkie akcje:',
    quickActions: [
      { label: 'Urząd', prompt: 'Wygeneruj 12 słówek o urzędach i dokumentach' },
      { label: 'Praca', prompt: 'Wygeneruj 12 słówek o pracy' },
      { label: 'Szkoła', prompt: 'Wygeneruj 12 słówek o szkole' },
      { label: 'Zdrowie', prompt: 'Wygeneruj 12 słówek o zdrowiu i lekarzu' },
      { label: 'Statystyki', prompt: 'Ile mam słówek?' },
    ],
    imageButtonTitle: 'Wczytaj zdjęcie notatek',
    fileButtonTitle: 'Wczytaj plik z notatkami',
    inputPlaceholder: 'Wpisz słówka lub zapytaj...',
    assistantTitle: 'Asystent AI',
    assistantSubtitle: 'Powered by Gemini',
    selectionHint: 'Zaznacz słówka, które chcesz dodać do biblioteki.',
    selectionHintOnboarding: 'Po dodaniu wybierz słówka do pierwszej misji.',
    minWords: (min: number) => `Wymagane min. ${min}`,
  },
  en: {
    loading: 'Loading...',
    welcomeMessage: (example: string) =>
      `Hi! I am your AI vocabulary assistant. I can:\n\n• Add words you type (e.g. "${example}")\n• Generate words by topic\n• Extract words from a photo or file\n• Show stats from your library\n\nHow can I help?`,
    defaultCategory: 'My words',
    defaultSetLabel: 'New set',
    defaultTopic: 'general',
    imageCategoryFallback: 'From photo',
    statsIntro: (wordCount: number, categoryCount: number) =>
      `You have **${wordCount}** words across **${categoryCount}** categories:\n\n`,
    statsLine: (label: string, count: number) => `• ${label}: ${count} words`,
    statsOutro: 'Want to add more words?',
    generatedWords: (count: number, topic: string, level: string) =>
      `I generated **${count}** words about "${topic}" (level ${level}).\n\nSelect the ones you want to add to your library:`,
    unsafeTopic:
      'I can’t generate words for that topic. Pick a neutral, school-appropriate topic (e.g., school, work, travel).',
    clarifyTopic:
      'The topic is too broad. Please be more specific, e.g., "shopping at a store" or "office work".',
    generatedFallback: (count: number, total: number, code?: string) =>
      `I used local data (missing or invalid API key${code ? `, ${code}` : ''}).\n\nFound ${Math.min(count, total)} sample words. Configure GEMINI_API_KEY in .env.local for full functionality.`,
    generatedFallbackLimit: (count: number, total: number, code?: string) =>
      `I used local data (AI limit reached${code ? `, ${code}` : ''}).\n\nFound ${Math.min(count, total)} sample words.`,
    generatedFallbackError: (count: number, total: number, code?: string) =>
      `I used local data (AI error${code ? `, ${code}` : ''}).\n\nFound ${Math.min(count, total)} sample words.`,
    foundWordsWithPhonetics: (count: number) =>
      `I found **${count}** words. Added correct phonetics.\n\nSelect the ones you want to add:`,
    foundWords: (count: number) => `I found **${count}** words. Select the ones you want to add:`,
    parseHelp:
      'I could not recognize words. Try a format like:\n\n• `word - translation`\n• `word1 - translation1, word2 - translation2`\n\nOr type: **"Topic: accounting, 10 words (A2)"**',
    imageUploaded: (fileName: string) => `Uploaded image: ${fileName}`,
    imageFound: (count: number, notes?: string) =>
      `Found **${count}** words in the image.\n\n${notes ? `Notes: ${notes}\n\n` : ''}Select the ones you want to add:`,
    imageNoWords: (target: string, native: string) =>
      `Could not recognize words in the image. Make sure your notes are readable and include ${target.toLowerCase()} words with ${native.toLowerCase()} translations.`,
    imageError:
      'Could not process the image. Try again or check your AI configuration.',
    fileUploaded: (fileName: string) => `Uploaded file: ${fileName}`,
    fileFound: (count: number, notes?: string) =>
      `Found **${count}** words in the file.\n\n${notes ? `Notes: ${notes}\n\n` : ''}Select the ones you want to add:`,
    fileNoWords: (target: string, native: string) =>
      `Could not recognize words in the file. Make sure the file contains ${target.toLowerCase()} words with ${native.toLowerCase()} translations.`,
    fileError:
      'Could not process the file. Try again or check your AI configuration.',
    fileTooLarge: (maxSize: number) =>
      `File is too large. Maximum size is ${maxSize} MB.`,
    fileTypeUnsupported: 'Unsupported file format. Use TXT, PDF, DOCX, or CSV.',
    fileSupportHint: (maxSize: number) =>
      `Supported: TXT, PDF, DOCX, CSV (up to ${maxSize} MB).`,
    fileReadError: 'Could not read the file.',
    aiLimitReached:
      'You have reached your monthly AI limit. Wait for the next reset or upgrade to Pro.',
    aiGlobalLimitReached:
      'The global AI budget has been reached. Please try again later.',
    aiRateLimited: 'AI is rate limited right now. Please try again in a moment.',
    aiConfigError: 'AI configuration error. Check GEMINI_API_KEY in .env.local.',
    aiServiceError: 'AI service error. Please try again later.',
    aiWaitlisted:
      'Your account is on the waitlist. AI will be available once access is granted.',
    aiSuspended: 'Your account is temporarily suspended. Contact support.',
    addedWords: (count: number, setName: string, category: string) =>
      `Added **${count}** words to set "${setName}" in category "${category}".\n\nWhat else can I do for you?`,
    setLabel: 'Set:',
    newSetOption: 'Create new set',
    setNameLabel: 'Name:',
    setNamePlaceholder: 'Set name',
    categoryLabel: 'Category:',
    categoryPlaceholder: 'Category name',
    selectedCount: (count: number) => `Selected: ${count}`,
    cancel: 'Cancel',
    add: (count: number) => `Add (${count})`,
    addOnboarding: (count: number) => `Add and continue (${count})`,
    processing: 'Working...',
    quickActionsLabel: 'Quick actions:',
    quickActions: [
      { label: 'Documents', prompt: 'Generate 12 words about documents and offices' },
      { label: 'Work', prompt: 'Generate 12 words about work' },
      { label: 'School', prompt: 'Generate 12 words about school' },
      { label: 'Health', prompt: 'Generate 12 words about health and doctor visits' },
      { label: 'Stats', prompt: 'How many words do I have?' },
    ],
    imageButtonTitle: 'Upload notes photo',
    fileButtonTitle: 'Upload notes file',
    inputPlaceholder: 'Type words or ask...',
    assistantTitle: 'AI Assistant',
    assistantSubtitle: 'Powered by Gemini',
    selectionHint: 'Select the words you want to add to your library.',
    selectionHintOnboarding: 'After adding, pick words for the first mission.',
    minWords: (min: number) => `Required min. ${min}`,
  },
  uk: {
    loading: 'Завантаження...',
    welcomeMessage: (example: string) =>
      `Привіт! Я твій AI-асистент для вивчення слів. Я можу:\n\n• Додати слова, які ти введеш (наприклад "${example}")\n• Згенерувати слова за темою\n• Витягнути слова з фото або файлу\n• Показати статистику твоєї бібліотеки\n\nЧим можу допомогти?`,
    defaultCategory: 'Мої слова',
    defaultSetLabel: 'Новий набір',
    defaultTopic: 'загальні',
    imageCategoryFallback: 'З фото',
    statsIntro: (wordCount: number, categoryCount: number) =>
      `У тебе всього **${wordCount}** слів у **${categoryCount}** категоріях:\n\n`,
    statsLine: (label: string, count: number) => `• ${label}: ${count} слів`,
    statsOutro: 'Хочеш додати більше слів?',
    generatedWords: (count: number, topic: string, level: string) =>
      `Згенерував **${count}** слів на тему "${topic}" (рівень ${level}).\n\nОбери ті, які хочеш додати до бібліотеки:`,
    unsafeTopic:
      'Не можу згенерувати слова для цієї теми. Обери нейтральну, шкільну тему (наприклад: школа, робота, подорожі).',
    clarifyTopic:
      'Тема надто загальна. Уточни, наприклад: "покупки в магазині" або "робота в офісі".',
    generatedFallback: (count: number, total: number, code?: string) =>
      `Використав локальні дані (немає або недійсний ключ API${code ? `, ${code}` : ''}).\n\nЗнайшов ${Math.min(count, total)} прикладових слів. Налаштуй GEMINI_API_KEY в .env.local для повної функціональності.`,
    generatedFallbackLimit: (count: number, total: number, code?: string) =>
      `Використав локальні дані (ліміт AI${code ? `, ${code}` : ''}).\n\nЗнайшов ${Math.min(count, total)} прикладових слів.`,
    generatedFallbackError: (count: number, total: number, code?: string) =>
      `Використав локальні дані (помилка AI${code ? `, ${code}` : ''}).\n\nЗнайшов ${Math.min(count, total)} прикладових слів.`,
    foundWordsWithPhonetics: (count: number) =>
      `Знайшов **${count}** слів. Додав коректну фонетику.\n\nОбери ті, які хочеш додати:`,
    foundWords: (count: number) =>
      `Знайшов **${count}** слів. Обери ті, які хочеш додати:`,
    parseHelp:
      'Не розпізнав слова. Спробуй формат:\n\n• `слово - переклад`\n• `слово1 - переклад1, слово2 - переклад2`\n\nАбо напиши: **"Тема: бухгалтерія, 10 слів (A2)"**',
    imageUploaded: (fileName: string) => `Завантажено фото: ${fileName}`,
    imageFound: (count: number, notes?: string) =>
      `Знайшов **${count}** слів на фото.\n\n${notes ? `Нотатки: ${notes}\n\n` : ''}Обери ті, які хочеш додати:`,
    imageNoWords: (target: string, native: string) =>
      `Не вдалося розпізнати слова на фото. Переконайся, що нотатки читабельні й містять слова ${target.toLowerCase()} з перекладами ${native.toLowerCase()}.`,
    imageError:
      'Не вдалося обробити фото. Спробуй ще раз або перевір конфігурацію AI.',
    fileUploaded: (fileName: string) => `Завантажено файл: ${fileName}`,
    fileFound: (count: number, notes?: string) =>
      `Знайшов **${count}** слів у файлі.\n\n${notes ? `Нотатки: ${notes}\n\n` : ''}Обери ті, які хочеш додати:`,
    fileNoWords: (target: string, native: string) =>
      `Не вдалося розпізнати слова у файлі. Переконайся, що файл містить слова ${target.toLowerCase()} з перекладами ${native.toLowerCase()}.`,
    fileError:
      'Не вдалося обробити файл. Спробуй ще раз або перевір конфігурацію AI.',
    fileTooLarge: (maxSize: number) =>
      `Файл завеликий. Максимальний розмір ${maxSize} МБ.`,
    fileTypeUnsupported: 'Непідтримуваний формат файлу. Використовуй TXT, PDF, DOCX або CSV.',
    fileSupportHint: (maxSize: number) =>
      `Підтримуються: TXT, PDF, DOCX, CSV (до ${maxSize} МБ).`,
    fileReadError: 'Не вдалося прочитати файл.',
    aiLimitReached:
      'Ви вичерпали місячний ліміт AI. Зачекайте на оновлення або перейдіть на Pro.',
    aiGlobalLimitReached:
      'Глобальний ліміт AI вичерпано. Спробуйте пізніше.',
    aiRateLimited: 'AI тимчасово перевантажене. Спробуй ще раз трохи пізніше.',
    aiConfigError: 'Помилка налаштування AI. Перевір GEMINI_API_KEY в .env.local.',
    aiServiceError: 'Сталася помилка сервісу AI. Спробуй пізніше.',
    aiWaitlisted:
      'Ваш акаунт у списку очікування. AI буде доступний після надання доступу.',
    aiSuspended:
      'Ваш акаунт тимчасово призупинений. Зверніться до адміністратора.',
    addedWords: (count: number, setName: string, category: string) =>
      `Додано **${count}** слів до набору "${setName}" у категорії "${category}".\n\nЩо ще можу для тебе зробити?`,
    setLabel: 'Набір:',
    newSetOption: 'Створити новий набір',
    setNameLabel: 'Назва:',
    setNamePlaceholder: 'Назва набору',
    categoryLabel: 'Категорія:',
    categoryPlaceholder: 'Назва категорії',
    selectedCount: (count: number) => `Обрано: ${count}`,
    cancel: 'Скасувати',
    add: (count: number) => `Додати (${count})`,
    addOnboarding: (count: number) => `Додати і продовжити (${count})`,
    processing: 'Обробляю...',
    quickActionsLabel: 'Швидкі дії:',
    quickActions: [
      { label: 'Документи', prompt: 'Згенеруй 12 слів на тему документи та уряд' },
      { label: 'Робота', prompt: 'Згенеруй 12 слів на тему робота' },
      { label: 'Школа', prompt: 'Згенеруй 12 слів на тему школа' },
      { label: 'Лікар', prompt: 'Згенеруй 12 слів на тему лікар і здоровʼя' },
      { label: 'Статистика', prompt: 'Скільки в мене слів?' },
    ],
    imageButtonTitle: 'Завантажити фото нотаток',
    fileButtonTitle: 'Завантажити файл нотаток',
    inputPlaceholder: 'Введи слова або запитай...',
    assistantTitle: 'AI Асистент',
    assistantSubtitle: 'Powered by Gemini',
    selectionHint: 'Обери слова, які хочеш додати до бібліотеки.',
    selectionHintOnboarding: 'Після додавання обери слова для першої місії.',
    minWords: (min: number) => `Потрібно мін. ${min}`,
  },
} as const;

type IntakeCopy = typeof wordIntakeCopy.pl;

interface WordIntakeProps {
  variant: 'chat' | 'onboarding';
  minWords?: number;
  onWordsAdded?: (payload: {
    setId: string;
    setName: string;
    wordCount: number;
  }) => void;
  className?: string;
}

const isSupportedFile = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return (
    (extension && SUPPORTED_FILE_EXTENSIONS.includes(extension)) ||
    SUPPORTED_FILE_MIME.includes(file.type)
  );
};

export function WordIntake({
  variant,
  minWords = 1,
  onWordsAdded,
  className,
}: WordIntakeProps) {
  const language = useLanguage();
  const t = (wordIntakeCopy[language] ?? wordIntakeCopy.pl) as IntakeCopy;
  const settings = useVocabStore((state) => state.settings);
  const activePair = useMemo(
    () => getLearningPair(settings.learning.pairId),
    [settings.learning.pairId]
  );
  const targetLabel = getLanguageLabel(activePair.target, language);
  const nativeLabel = getLanguageLabel(activePair.native, language);
  const examplePair =
    LEARNING_PAIR_SAMPLES[activePair.id] ??
    ({ target: 'word', native: 'translation' } as const);
  const welcomeMessage = t.welcomeMessage(
    `${examplePair.target} - ${examplePair.native}`
  );
  const dateLocale = language === 'en' ? 'en-US' : language === 'uk' ? 'uk-UA' : 'pl-PL';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedWords, setParsedWords] = useState<ParsedWord[]>([]);
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [suggestedSetName, setSuggestedSetName] = useState('');
  const [selectedSetOption, setSelectedSetOption] = useState(NEW_SET_OPTION);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const vocabulary = useVocabStore((state) => state.getActiveVocabulary());
  const addVocabulary = useVocabStore((state) => state.addVocabulary);
  const getCategories = useVocabStore((state) => state.getCategories);
  const createSet = useVocabStore((state) => state.createSet);
  const sets = useVocabStore((state) => state.getActiveSets());

  const categories = getCategories();
  const selectedWordCount = parsedWords.filter((word) => word.selected).length;
  const requiresSetName = selectedSetOption === NEW_SET_OPTION;
  const hasSetName = suggestedSetName.trim().length > 0;
  const canAddWords = selectedWordCount >= minWords && (!requiresSetName || hasSetName);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, parsedWords, isProcessing]);

  useEffect(() => {
    if (messages.length > 0) return;
    setMessages([
      {
        id: generateId(),
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
      },
    ]);
  }, [messages.length, welcomeMessage]);

  useEffect(() => {
    if (selectedSetOption === NEW_SET_OPTION) return;
    if (!sets.some((set) => set.id === selectedSetOption)) {
      setSelectedSetOption(NEW_SET_OPTION);
    }
  }, [selectedSetOption, sets]);

  const addAssistantMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: 'assistant',
        content,
        timestamp: new Date(),
      },
    ]);
  };

  const appendErrorCode = (message: string, code?: string) =>
    code ? `${message} (${code})` : message;

  const handleAiLimitError = (
    data?: { error?: string },
    options: { silent?: boolean } = {}
  ) => {
    const errorCode = data?.error;
    if (typeof errorCode !== 'string') return null;

    const shouldNotify = !options.silent;
    const notify = (message: string) => {
      if (!shouldNotify) return;
      addAssistantMessage(message);
    };
    const notifyWithCode = (message: string) =>
      notify(appendErrorCode(message, errorCode));

    if (errorCode === 'user_limit_reached') {
      notify(t.aiLimitReached);
      return 'user_limit';
    }
    if (errorCode === 'global_limit_reached') {
      notify(t.aiGlobalLimitReached);
      return 'global_limit';
    }
    if (errorCode === 'waitlisted') {
      notify(t.aiWaitlisted);
      return 'waitlisted';
    }
    if (errorCode === 'suspended') {
      notify(t.aiSuspended);
      return 'suspended';
    }
    if (errorCode === 'rate_limited' || errorCode === 'ai_rate_limited') {
      notifyWithCode(t.aiRateLimited);
      return 'rate_limited';
    }
    if (
      errorCode === 'api_key_missing' ||
      errorCode === 'ai_invalid_key' ||
      errorCode === 'ai_permission_denied'
    ) {
      notifyWithCode(t.aiConfigError);
      return 'config';
    }
    if (errorCode.startsWith('ai_')) {
      notifyWithCode(t.aiServiceError);
      return 'service';
    }

    return null;
  };

  const buildSetName = (base?: string) => {
    const trimmed = base?.trim();
    const label = trimmed && trimmed.length > 0 ? trimmed : t.defaultSetLabel;
    return `${label} (${formatDate(new Date(), dateLocale)})`;
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = input;
    setInput('');
    setIsProcessing(true);

    await processMessage(messageText);
    setIsProcessing(false);
  };

  const processMessage = async (text: string) => {
    const normalizedText = normalizeForMatch(text);
    const statsKeywords = [
      'ile mam',
      'statystyki',
      'pokaż słówka',
      'pokaz slowka',
      'moje słówka',
      'moje slowka',
      'how many',
      'stats',
      'show words',
      'my words',
      'vocabulary',
      'скільки слів',
      'статистика',
      'мої слова',
      'покажи слова',
    ];
    const normalizedStatsKeywords = statsKeywords.map(normalizeForMatch);
    const hasTopicHint = containsKeyword(normalizedText, TOPIC_HINTS);
    const topicPatterns = [
      /o\s+([^\d]+?)(?:\s+poziom|\s+level|\s*$)/i,
      /na temat\s+(.+?)(?:\s+poziom|\s+level|\s*$)/i,
      /t.?e.?m.?a.?t[:\s]+(.+?)(?:\s+poziom|\s+level|\s*$)/i,
      /tema[:\s]+(.+?)(?:\s+poziom|\s+level|\s*$)/i,
      /about\s+(.+?)(?:\s+level|\s*$)/i,
      /topic[:\s]+(.+?)(?:\s+level|\s*$)/i,
      /про\s+([^\d]+?)(?:\s+рівень|\s+level|\s*$)/i,
      /на тему\s+(.+?)(?:\s+рівень|\s+level|\s*$)/i,
      /тема[:\s]+(.+?)(?:\s+рівень|\s+level|\s*$)/i,
    ];
    const hasTopicPattern = topicPatterns.some((pattern) => pattern.test(text));
    const wordHintPattern =
      /\b(sł[oó]w\w*|slow\w*|words?|vocab\w*|слов\w*|слів\w*|лексик\w*)\b/i;
    const hasWordHint =
      containsKeyword(normalizedText, GENERATION_NOUNS) ||
      wordHintPattern.test(text);
    const hasLanguageHint = containsKeyword(normalizedText, LANGUAGE_HINTS);
    const hasGenerationVerb = containsKeyword(normalizedText, GENERATION_VERBS);
    const hasCountHint = Boolean(text.match(/\b\d+\b/));
    const wantsGeneration =
      hasGenerationVerb ||
      hasTopicHint ||
      hasTopicPattern ||
      (hasWordHint && (hasLanguageHint || hasCountHint));
    const wantsStats = containsKeyword(normalizedText, normalizedStatsKeywords);

    if (wantsGeneration) {
      const match =
        text.match(/(\d+)\s+sł[oó]w/i) ||
        text.match(/(\d+)\s+slow/i) ||
        text.match(/(\d+)\s+word/i) ||
        text.match(/(\d+)\s+слов/i);
      const count = match ? parseInt(match[1]) : 10;

      let topic: string = t.defaultTopic;
      for (const pattern of topicPatterns) {
        const topicMatch = text.match(pattern);
        if (topicMatch) {
          topic = topicMatch[1].trim();
          break;
        }
      }
      if (topic === t.defaultTopic) {
        const colonIndex = text.indexOf(':');
        if (colonIndex !== -1 && colonIndex < text.length - 1) {
          topic = text.slice(colonIndex + 1).trim();
        }
      }
      topic = stripTopicLanguage(topic);
      topic = topic.replace(/\b(poziom|level)\s*(A1|A2|B1|B2)\b/gi, '').trim();
      if (!topic) {
        topic = t.defaultTopic;
      }

      const levelMatch =
        text.match(/poziom\s*(A1|A2|B1|B2)/i) ||
        text.match(/рівень\s*(A1|A2|B1|B2)/i) ||
        text.match(/(A1|A2|B1|B2)/i);
      const level = levelMatch ? levelMatch[1].toUpperCase() : 'A2';

      await generateWordsWithAI(count, topic, level);
      return;
    }

    if (wantsStats) {
      const summaryIntro = t.statsIntro(vocabulary.length, categories.length);
      const categoryLines = categories
        .map((cat) => {
          const count = vocabulary.filter((v) => v.category === cat).length;
          return t.statsLine(getCategoryLabel(cat, language), count);
        })
        .join('\n');
      addAssistantMessage(`${summaryIntro}${categoryLines}\n\n${t.statsOutro}`);
      return;
    }

    await parseTextWithAI(text);
  };

  const generateWordsWithAI = async (count: number, topic: string, level: string) => {
    try {
      const response = await fetch('/api/ai/generate-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          count,
          level,
          targetLanguage: activePair.target,
          nativeLanguage: activePair.native,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (data?.error === 'unsafe_topic') {
          addAssistantMessage(t.unsafeTopic);
          return;
        }
        if (data?.error === 'needs_clarification') {
          addAssistantMessage(t.clarifyTopic);
          return;
        }
        if (
          data?.error === 'user_limit_reached' ||
          data?.error === 'global_limit_reached'
        ) {
          await generateWordsLocal(count, topic, 'limit', data?.error);
          return;
        }
        const aiError = handleAiLimitError(data, { silent: true });
        if (aiError === 'config') {
          await generateWordsLocal(count, topic, 'config', data?.error);
          return;
        }
        if (aiError === 'rate_limited' || aiError === 'service') {
          await generateWordsLocal(count, topic, 'error', data?.error);
          return;
        }
        if (aiError === 'waitlisted' || aiError === 'suspended') {
          handleAiLimitError(data);
          return;
        }
        throw new Error('API error');
      }

      if (data?.error === 'unsafe_topic') {
        addAssistantMessage(t.unsafeTopic);
        return;
      }
      if (data?.error === 'needs_clarification') {
        addAssistantMessage(t.clarifyTopic);
        return;
      }

      if (data.words && data.words.length > 0) {
        setParsedWords(
          data.words.map((w: ParsedWord) => ({
            ...normalizeParsedWord(w),
            selected: true,
          }))
        );
        const finalTopic = data.topic || topic;
        setSuggestedCategory(finalTopic);
        setSuggestedSetName(buildSetName(finalTopic));
        setSelectedSetOption(NEW_SET_OPTION);

        addAssistantMessage(t.generatedWords(data.words.length, topic, level));
      } else {
        throw new Error('No words generated');
      }
    } catch (error) {
      console.error('Generate error:', error);
      await generateWordsLocal(count, topic, 'error');
    }
  };

  const generateWordsLocal = async (
    count: number,
    topic: string,
    reason: 'limit' | 'config' | 'error' = 'config',
    errorCode?: string
  ) => {
    const fallbackWords = (FALLBACK_WORDS[activePair.id] ?? FALLBACK_WORDS['pl-en']).map(
      (word) => ({
        ...word,
        selected: true,
      })
    );

    setParsedWords(fallbackWords.slice(0, count));
    setSuggestedCategory(topic);
    setSuggestedSetName(buildSetName(topic));
    setSelectedSetOption(NEW_SET_OPTION);

    const fallbackMessage =
      reason === 'limit'
        ? t.generatedFallbackLimit(count, fallbackWords.length, errorCode)
        : reason === 'error'
          ? t.generatedFallbackError(count, fallbackWords.length, errorCode)
          : t.generatedFallback(count, fallbackWords.length, errorCode);
    addAssistantMessage(fallbackMessage);
  };

  const parseTextWithAI = async (text: string) => {
    const localWords = parseVocabularyInput(text);

    if (localWords.length > 0) {
      try {
        const response = await fetch('/api/ai/parse-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            targetLanguage: activePair.target,
            nativeLanguage: activePair.native,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          handleAiLimitError(data);
        } else if (data?.words && data.words.length > 0) {
          setParsedWords(
            data.words.map((w: ParsedWord) => ({
              ...normalizeParsedWord(w),
              selected: true,
            }))
          );
          const category = data.category_suggestion || t.defaultCategory;
          setSuggestedCategory(category);
          setSuggestedSetName(buildSetName(category));
          setSelectedSetOption(NEW_SET_OPTION);
          addAssistantMessage(t.foundWordsWithPhonetics(data.words.length));
          return;
        }
      } catch (error) {
        console.error('Parse API error:', error);
      }

      setParsedWords(localWords.map((w) => ({ ...w, selected: true })));
      setSuggestedCategory(t.defaultCategory);
      setSuggestedSetName(buildSetName(t.defaultCategory));
      setSelectedSetOption(NEW_SET_OPTION);
      addAssistantMessage(t.foundWords(localWords.length));
      return;
    }

    addAssistantMessage(t.parseHelp);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      addAssistantMessage(t.fileTooLarge(MAX_UPLOAD_SIZE_MB));
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
      return;
    }

    setIsProcessing(true);

    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: 'user',
        content: t.imageUploaded(file.name),
        timestamp: new Date(),
      },
    ]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetLanguage', activePair.target);
      formData.append('nativeLanguage', activePair.native);

      const response = await fetch('/api/ai/extract-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 413) {
          addAssistantMessage(t.fileTooLarge(MAX_UPLOAD_SIZE_MB));
          setIsProcessing(false);
          return;
        }
        if (handleAiLimitError(data)) {
          setIsProcessing(false);
          return;
        }
        throw new Error('API error');
      }

      if (data.words && data.words.length > 0) {
        setParsedWords(
          data.words.map((w: ParsedWord) => ({
            ...normalizeParsedWord(w),
            selected: true,
          }))
        );
        const category = data.category_suggestion || t.imageCategoryFallback;
        setSuggestedCategory(category);
        setSuggestedSetName(buildSetName(category));
        setSelectedSetOption(NEW_SET_OPTION);

        addAssistantMessage(t.imageFound(data.words.length, data.notes));
      } else {
        addAssistantMessage(t.imageNoWords(targetLabel, nativeLabel));
      }
    } catch (error) {
      console.error('Image extraction error:', error);
      addAssistantMessage(t.imageError);
    }

    setIsProcessing(false);

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      addAssistantMessage(t.fileTooLarge(MAX_UPLOAD_SIZE_MB));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (!isSupportedFile(file)) {
      addAssistantMessage(t.fileTypeUnsupported);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsProcessing(true);
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: 'user',
        content: t.fileUploaded(file.name),
        timestamp: new Date(),
      },
    ]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetLanguage', activePair.target);
      formData.append('nativeLanguage', activePair.native);

      const response = await fetch('/api/ai/extract-file', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 413) {
          addAssistantMessage(t.fileTooLarge(MAX_UPLOAD_SIZE_MB));
          setIsProcessing(false);
          return;
        }
        if (response.status === 415) {
          addAssistantMessage(t.fileTypeUnsupported);
          setIsProcessing(false);
          return;
        }
        if (handleAiLimitError(data)) {
          setIsProcessing(false);
          return;
        }
        throw new Error('API error');
      }

      if (data.words && data.words.length > 0) {
        setParsedWords(
          data.words.map((w: ParsedWord) => ({
            ...normalizeParsedWord(w),
            selected: true,
          }))
        );
        const category = data.category_suggestion || t.defaultCategory;
        setSuggestedCategory(category);
        setSuggestedSetName(buildSetName(category));
        setSelectedSetOption(NEW_SET_OPTION);

        addAssistantMessage(t.fileFound(data.words.length, data.notes));
      } else {
        addAssistantMessage(t.fileNoWords(targetLabel, nativeLabel));
      }
    } catch (error) {
      console.error('File extraction error:', error);
      addAssistantMessage(t.fileError);
    }

    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleWord = (index: number) => {
    setParsedWords((prev) =>
      prev.map((word, i) => (i === index ? { ...word, selected: !word.selected } : word))
    );
  };

  const addSelectedWords = () => {
    const selectedWords = parsedWords.filter((word) => word.selected);
    if (selectedWords.length === 0 || !canAddWords) return;

    let targetSetId = '';
    let targetSetName = '';
    const existingSet = sets.find((set) => set.id === selectedSetOption);
    if (selectedSetOption !== NEW_SET_OPTION && existingSet) {
      targetSetId = existingSet.id;
      targetSetName = existingSet.name;
    } else {
      const setLabel =
        suggestedSetName.trim() || buildSetName(suggestedCategory || t.defaultSetLabel);
      const newSet = createSet(setLabel);
      targetSetId = newSet.id;
      targetSetName = newSet.name;
    }

    const newVocab: VocabularyItem[] = selectedWords.map((word) => ({
      id: generateId(),
      en: word.target,
      phonetic: word.phonetic,
      pl: word.native,
      category: suggestedCategory || t.defaultCategory,
      setIds: [targetSetId],
      example_en: word.example_target,
      example_pl: word.example_native,
      difficulty: word.difficulty ?? 'medium',
      created_at: new Date(),
      source: 'ai_generated' as const,
      languagePair: activePair.id,
    }));

    addVocabulary(newVocab);
    setParsedWords([]);
    setSuggestedCategory('');
    setSuggestedSetName('');
    setSelectedSetOption(NEW_SET_OPTION);

    addAssistantMessage(
      t.addedWords(selectedWords.length, targetSetName, suggestedCategory || t.defaultCategory)
    );

    onWordsAdded?.({
      setId: targetSetId,
      setName: targetSetName,
      wordCount: selectedWords.length,
    });
  };

  const cancelWords = () => {
    setParsedWords([]);
    setSuggestedCategory('');
    setSuggestedSetName('');
    setSelectedSetOption(NEW_SET_OPTION);
  };

  const selectionHint =
    variant === 'onboarding' ? t.selectionHintOnboarding : t.selectionHint;
  const addLabel =
    variant === 'onboarding'
      ? t.addOnboarding(selectedWordCount)
      : t.add(selectedWordCount);
  const compactChatSpacing =
    variant === 'chat' &&
    messages.length <= 1 &&
    parsedWords.length === 0 &&
    !isProcessing;
  const chatMessagesPadding = compactChatSpacing
    ? 'pb-6'
    : 'pb-[calc(12rem+env(safe-area-inset-bottom))]';
  const inputPanel = (
    <>
      <div className="flex flex-wrap gap-2 mb-2">
        {t.quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => setInput(action.prompt)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm bg-primary-50 dark:bg-primary-900 text-primary-600 dark:text-primary-400 hover:bg-primary-100"
          >
            {action.label}
          </button>
        ))}
      </div>
          <p className="text-xs text-slate-500 mb-2">{t.fileSupportHint(MAX_UPLOAD_SIZE_MB)}</p>

      <div className="flex gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={isProcessing}
          className="p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50"
          title={t.imageButtonTitle}
        >
          <ImageIcon size={20} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,.pdf,.docx,text/plain,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50"
          title={t.fileButtonTitle}
        >
          <FileText size={20} />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={t.inputPlaceholder}
          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={isProcessing}
        />
        <Button onClick={handleSend} disabled={!input.trim() || isProcessing} className="px-4">
          <Send size={20} />
        </Button>
      </div>
    </>
  );

  if (variant === 'chat') {
    return (
      <div className={cn('flex flex-col flex-1', className)}>
        <div
          className={cn(
            'flex-1 overflow-y-auto p-4 space-y-4',
            chatMessagesPadding
          )}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-3',
                  message.role === 'user'
                    ? 'bg-primary-500 text-white rounded-br-md'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-md'
                )}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              </div>
            </div>
          ))}

          {parsedWords.length > 0 && (
            <Card className="mx-2 scroll-mb-[12rem]">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">{selectionHint}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{t.selectedCount(selectedWordCount)}</span>
                    {minWords > 1 && <span>{t.minWords(minWords)}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 min-w-[80px]">
                      {t.setLabel}
                    </p>
                    <select
                      data-testid="set-selector"
                      value={selectedSetOption}
                      onChange={(e) => setSelectedSetOption(e.target.value)}
                      className="text-sm px-3 py-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 flex-1"
                    >
                      <option value={NEW_SET_OPTION}>{t.newSetOption}</option>
                      {sets.map((set) => (
                        <option key={set.id} value={set.id}>
                          {set.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedSetOption === NEW_SET_OPTION && (
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 min-w-[80px]">
                        {t.setNameLabel}
                      </p>
                      <input
                        type="text"
                        value={suggestedSetName}
                        onChange={(e) => setSuggestedSetName(e.target.value)}
                        className="text-sm px-3 py-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 flex-1"
                        placeholder={t.setNamePlaceholder}
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 min-w-[80px]">
                      {t.categoryLabel}
                    </p>
                    <input
                      type="text"
                      value={suggestedCategory}
                      onChange={(e) => setSuggestedCategory(e.target.value)}
                      className="text-sm px-3 py-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 flex-1"
                      placeholder={t.categoryPlaceholder}
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {parsedWords.map((word, index) => (
                    <button
                      key={`${word.target}-${word.native}-${index}`}
                      onClick={() => toggleWord(index)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                        word.selected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900'
                          : 'border-slate-200 dark:border-slate-700'
                      )}
                    >
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                          word.selected
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-slate-300 dark:border-slate-600'
                        )}
                      >
                        {word.selected && <Check size={12} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-100">
                          {word.target}{' '}
                          <span className="text-slate-500 font-normal text-sm">
                            {word.phonetic}
                          </span>
                        </p>
                        <p className="text-sm text-slate-500 truncate">{word.native}</p>
                        {word.example_target && (
                          <p className="text-xs text-slate-400 italic mt-1 truncate">
                            "{word.example_target}"
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

              </CardContent>
            </Card>
          )}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                <Loader2 size={20} className="animate-spin text-primary-500" />
                <span className="text-sm text-slate-500">{t.processing}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-0 right-0 md:left-24 md:bottom-8 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4">
          <div className="max-w-3xl mx-auto">
            {parsedWords.length > 0 ? (
              <div className="flex gap-3">
                <Button variant="secondary" onClick={cancelWords} className="flex-1">
                  <X size={18} className="mr-2" />
                  {t.cancel}
                </Button>
                <Button onClick={addSelectedWords} className="flex-1" disabled={!canAddWords}>
                  <Plus size={18} className="mr-2" />
                  {addLabel}
                </Button>
              </div>
            ) : (
              inputPanel
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-6 md:grid-cols-[1.2fr_1fr]', className)}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-amber-400 flex items-center justify-center">
            <Wand2 size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t.assistantTitle}
            </p>
            <p className="text-xs text-slate-500">{t.quickActionsLabel}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 max-h-64 overflow-y-auto space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                  message.role === 'user'
                    ? 'bg-primary-500 text-white rounded-br-md'
                    : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-md'
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-700 rounded-2xl rounded-bl-md px-3 py-2 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin text-primary-500" />
                {t.processing}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {t.quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => setInput(action.prompt)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900 text-primary-600 dark:text-primary-300 hover:bg-primary-100"
              >
                {action.label}
              </button>
            ))}
          </div>
              <p className="text-xs text-slate-500">{t.fileSupportHint(MAX_UPLOAD_SIZE_MB)}</p>
          <div className="flex gap-2">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={isProcessing}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50"
              title={t.imageButtonTitle}
            >
              <ImageIcon size={20} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv,.pdf,.docx,text/plain,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50"
              title={t.fileButtonTitle}
            >
              <FileText size={20} />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t.inputPlaceholder}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isProcessing}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="px-4"
            >
              <Send size={18} />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
          <p className="text-xs text-slate-500">{selectionHint}</p>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{t.selectedCount(selectedWordCount)}</span>
            {minWords > 1 && <span>{t.minWords(minWords)}</span>}
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-slate-400">
              {t.setLabel}
            </label>
            <select
              data-testid="set-selector"
              value={selectedSetOption}
              onChange={(e) => setSelectedSetOption(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={NEW_SET_OPTION}>{t.newSetOption}</option>
              {sets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name}
                </option>
              ))}
            </select>
          </div>
          {selectedSetOption === NEW_SET_OPTION && (
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-slate-400">
                {t.setNameLabel}
              </label>
              <input
                type="text"
                value={suggestedSetName}
                onChange={(e) => setSuggestedSetName(e.target.value)}
                placeholder={t.setNamePlaceholder}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-slate-400">
              {t.categoryLabel}
            </label>
            <input
              type="text"
              value={suggestedCategory}
              onChange={(e) => setSuggestedCategory(e.target.value)}
              placeholder={t.categoryPlaceholder}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 space-y-2 max-h-64 overflow-y-auto">
          {parsedWords.length === 0 ? (
            <p className="text-sm text-slate-500">{selectionHint}</p>
          ) : (
            parsedWords.map((word, index) => (
              <button
                key={`${word.target}-${word.native}-${index}`}
                onClick={() => toggleWord(index)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                  word.selected
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900'
                    : 'border-slate-200 dark:border-slate-700'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    word.selected
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-slate-300 dark:border-slate-600'
                  )}
                >
                  {word.selected && <Check size={12} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {word.target}{' '}
                    <span className="text-slate-500 font-normal text-xs">
                      {word.phonetic}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 truncate">{word.native}</p>
                  {word.example_target && (
                    <p className="text-xs text-slate-400 italic mt-1 truncate">
                      "{word.example_target}"
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={cancelWords} className="flex-1">
            <X size={18} className="mr-2" />
            {t.cancel}
          </Button>
          <Button onClick={addSelectedWords} className="flex-1" disabled={!canAddWords}>
            <Plus size={18} className="mr-2" />
            {addLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

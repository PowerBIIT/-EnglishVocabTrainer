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
  Microscope,
  Calculator,
  Globe,
  Landmark,
  BookOpen,
  BarChart3,
  GraduationCap,
  ClipboardList,
  Stethoscope,
  Bus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
    { target: 'school', phonetic: '/skuːl/', native: 'szkoła' },
    { target: 'teacher', phonetic: '/ˈtiːtʃər/', native: 'nauczyciel' },
    { target: 'student', phonetic: '/ˈstjuːdənt/', native: 'uczeń' },
    { target: 'homework', phonetic: '/ˈhoʊmwɜːrk/', native: 'praca domowa' },
    { target: 'book', phonetic: '/bʊk/', native: 'książka' },
    { target: 'desk', phonetic: '/desk/', native: 'biurko' },
    { target: 'pen', phonetic: '/pen/', native: 'długopis' },
    { target: 'lesson', phonetic: '/ˈlesən/', native: 'lekcja' },
    { target: 'exam', phonetic: '/ɪɡˈzæm/', native: 'sprawdzian' },
    { target: 'break', phonetic: '/breɪk/', native: 'przerwa' },
    { target: 'friend', phonetic: '/frend/', native: 'przyjaciel' },
  ],
  'de-en': [
    { target: 'example', phonetic: '/ɪɡˈzɑːmpl/', native: 'Beispiel' },
    { target: 'word', phonetic: '/wɜːd/', native: 'Wort' },
    { target: 'learn', phonetic: '/lɜːn/', native: 'lernen' },
    { target: 'school', phonetic: '/skuːl/', native: 'Schule' },
    { target: 'teacher', phonetic: '/ˈtiːtʃər/', native: 'Lehrer' },
    { target: 'student', phonetic: '/ˈstjuːdənt/', native: 'Schüler' },
    { target: 'homework', phonetic: '/ˈhoʊmwɜːrk/', native: 'Hausaufgaben' },
    { target: 'book', phonetic: '/bʊk/', native: 'Buch' },
    { target: 'desk', phonetic: '/desk/', native: 'Schreibtisch' },
    { target: 'pen', phonetic: '/pen/', native: 'Stift' },
    { target: 'lesson', phonetic: '/ˈlesən/', native: 'Unterricht' },
    { target: 'exam', phonetic: '/ɪɡˈzæm/', native: 'Prüfung' },
    { target: 'break', phonetic: '/breɪk/', native: 'Pause' },
    { target: 'friend', phonetic: '/frend/', native: 'Freund' },
  ],
  'uk-pl': [
    { target: 'przykład', phonetic: '', native: 'приклад' },
    { target: 'słowo', phonetic: '', native: 'слово' },
    { target: 'uczyć się', phonetic: '', native: 'вчитися' },
    { target: 'szkoła', phonetic: '', native: 'школа' },
    { target: 'nauczyciel', phonetic: '', native: 'вчитель' },
    { target: 'uczeń', phonetic: '', native: 'учень' },
    { target: 'praca domowa', phonetic: '', native: 'домашнє завдання' },
    { target: 'książka', phonetic: '', native: 'книга' },
    { target: 'biurko', phonetic: '', native: 'парта' },
    { target: 'długopis', phonetic: '', native: 'ручка' },
    { target: 'lekcja', phonetic: '', native: 'урок' },
    { target: 'sprawdzian', phonetic: '', native: 'контрольна' },
    { target: 'przerwa', phonetic: '', native: 'перерва' },
    { target: 'przyjaciel', phonetic: '', native: 'друг' },
  ],
  'uk-en': [
    { target: 'school', phonetic: '/skuːl/', native: 'школа' },
    { target: 'friend', phonetic: '/frend/', native: 'друг' },
    { target: 'learn', phonetic: '/lɜːn/', native: 'вчитися' },
    { target: 'example', phonetic: '/ɪɡˈzɑːmpl/', native: 'приклад' },
    { target: 'word', phonetic: '/wɜːd/', native: 'слово' },
    { target: 'teacher', phonetic: '/ˈtiːtʃər/', native: 'вчитель' },
    { target: 'student', phonetic: '/ˈstjuːdənt/', native: 'учень' },
    { target: 'homework', phonetic: '/ˈhoʊmwɜːrk/', native: 'домашнє завдання' },
    { target: 'book', phonetic: '/bʊk/', native: 'книга' },
    { target: 'desk', phonetic: '/desk/', native: 'парта' },
    { target: 'pen', phonetic: '/pen/', native: 'ручка' },
    { target: 'lesson', phonetic: '/ˈlesən/', native: 'урок' },
    { target: 'exam', phonetic: '/ɪɡˈzæm/', native: 'іспит' },
    { target: 'break', phonetic: '/breɪk/', native: 'перерва' },
  ],
  'uk-de': [
    { target: 'Schule', phonetic: '', native: 'школа' },
    { target: 'Freund', phonetic: '', native: 'друг' },
    { target: 'lernen', phonetic: '', native: 'вчитися' },
    { target: 'Beispiel', phonetic: '', native: 'приклад' },
    { target: 'Wort', phonetic: '', native: 'слово' },
    { target: 'Lehrer', phonetic: '', native: 'вчитель' },
    { target: 'Schüler', phonetic: '', native: 'учень' },
    { target: 'Hausaufgabe', phonetic: '', native: 'домашнє завдання' },
    { target: 'Buch', phonetic: '', native: 'книга' },
    { target: 'Schreibtisch', phonetic: '', native: 'парта' },
    { target: 'Stift', phonetic: '', native: 'ручка' },
    { target: 'Unterricht', phonetic: '', native: 'урок' },
    { target: 'Prüfung', phonetic: '', native: 'іспит' },
    { target: 'Pause', phonetic: '', native: 'перерва' },
  ],
};

export const wordIntakeCopy = {
  pl: {
    loading: 'Ładowanie...',
    welcomeMessage: (example: string) =>
      `Witaj! Jestem Twoim asystentem do słówek szkolnych. Mogę:\n\n• Dodać słówka z kartkówki (np. "${example}")\n• Wygenerować słówka z tematu lekcji\n• Wyciągnąć słówka ze zdjęcia lub pliku\n• Pokazać statystyki Twojej biblioteki\n\nJak mogę Ci pomóc?`,
    defaultCategory: 'Moje słówka',
    defaultSetLabel: 'Nowy zestaw',
    defaultTopic: 'szkoła',
    imageCategoryFallback: 'Ze zdjęcia',
    statsIntro: (wordCount: number, categoryCount: number) =>
      `Masz łącznie **${wordCount}** słówek w **${categoryCount}** kategoriach:\n\n`,
    statsLine: (label: string, count: number) => `• ${label}: ${count} słówek`,
    statsOutro: 'Chcesz dodać więcej słówek?',
    generatedWords: (count: number, topic: string, level: string) =>
      `Wygenerowałem **${count}** słówek na temat "${topic}" (poziom ${level}).\n\nZaznacz te, które chcesz dodać do biblioteki:`,
    generatedWordsPartial: (count: number, requested: number, topic: string, level: string) =>
      `Wygenerowałem **${count}** z **${requested}** słówek na temat "${topic}" (poziom ${level}).\n\nSpróbuj mniejszej liczby słówek, jeśli potrzebujesz pełnej listy.\n\nZaznacz te, które chcesz dodać do biblioteki:`,
    unsafeTopic:
      'Nie mogę wygenerować słówek dla tego tematu. Wybierz neutralny, szkolny temat (np. szkoła, praca, podróże).',
    clarifyTopic:
      'Temat jest zbyt ogólny. Doprecyzuj, np. "zakupy w sklepie" lub "praca w biurze".',
    generatedFallback: (count: number, total: number, code?: string) =>
      `Użyłem lokalnych danych (brak lub nieprawidłowy klucz API${code ? `, ${code}` : ''}).\n\nZnalazłem ${Math.min(count, total)} przykładowych słówek. Skonfiguruj GEMINI_API_KEY w .env.local dla pełnej funkcjonalności.`,
    generatedFallbackLimit: (count: number, total: number, code?: string) =>
      `Użyłem lokalnych danych (limit AI${code ? `, ${code}` : ''}).\n\nZnalazłem ${Math.min(count, total)} przykładowych słówek.`,
    generatedFallbackTruncated: (count: number, total: number, code?: string) =>
      `Odpowiedź AI była zbyt długa i została ucięta${code ? `, ${code}` : ''}.\n\nSpróbuj mniejszej liczby słówek (np. 8-10). Użyłem lokalnych danych i znalazłem ${Math.min(count, total)} przykładowych słówek.`,
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
    imageTruncated:
      'Zdjęcie zawiera zbyt dużo słówek. Podziel notatki na mniejsze części (max 20-30 słówek na zdjęcie).',
    imageTips:
      'Podpowiedź: zrób zdjęcie prosto z góry, bez cieni, z wyraźnym kontrastem. Najlepiej jedna sekcja tekstu na zdjęciu.',
    imageTypeUnsupported:
      'Nieobsługiwany format zdjęcia. Użyj JPG, PNG lub WEBP.',
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
      `Zdjęcia: JPG/PNG/WEBP (do ${maxSize} MB, automatycznie zmniejszamy). Pliki: TXT, PDF, DOCX, CSV.`,
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
      { label: 'Biologia', prompt: 'Wygeneruj 12 słówek z biologii', icon: Microscope },
      { label: 'Matematyka', prompt: 'Wygeneruj 12 słówek z matematyki', icon: Calculator },
      { label: 'Geografia', prompt: 'Wygeneruj 12 słówek z geografii', icon: Globe },
      { label: 'Historia', prompt: 'Wygeneruj 12 słówek z historii', icon: Landmark },
      { label: 'Lektury', prompt: 'Wygeneruj 12 słówek z lektur', icon: BookOpen },
      { label: 'Statystyki', prompt: 'Ile mam słówek?', icon: BarChart3 },
    ],
    imageButtonTitle: 'Wczytaj zdjęcie notatek',
    fileButtonTitle: 'Wczytaj plik z notatkami',
    inputPlaceholder: 'Wpisz słówka lub zapytaj...',
    assistantTitle: 'Asystent AI',
    assistantSubtitle: 'Powered by Gemini',
    selectionHint: 'Zaznacz słówka, które chcesz dodać do biblioteki.',
    selectionHintOnboarding: 'Po dodaniu wybierz słówka do pierwszej misji.',
    minWords: (min: number) => `Wymagane min. ${min}`,
    selectAll: 'Zaznacz wszystkie',
    deselectAll: 'Odznacz',
    imageLabel: 'Zdjęcie',
    fileLabel: 'Plik',
  },
  en: {
    loading: 'Loading...',
    welcomeMessage: (example: string) =>
      `Hi! I am your school vocabulary assistant. I can:\n\n• Add words from a test (e.g. "${example}")\n• Generate words for a lesson topic\n• Extract words from a photo or file\n• Show stats from your library\n\nHow can I help?`,
    defaultCategory: 'My words',
    defaultSetLabel: 'New set',
    defaultTopic: 'school',
    imageCategoryFallback: 'From photo',
    statsIntro: (wordCount: number, categoryCount: number) =>
      `You have **${wordCount}** words across **${categoryCount}** categories:\n\n`,
    statsLine: (label: string, count: number) => `• ${label}: ${count} words`,
    statsOutro: 'Want to add more words?',
    generatedWords: (count: number, topic: string, level: string) =>
      `I generated **${count}** words about "${topic}" (level ${level}).\n\nSelect the ones you want to add to your library:`,
    generatedWordsPartial: (count: number, requested: number, topic: string, level: string) =>
      `I generated **${count}** of **${requested}** words about "${topic}" (level ${level}).\n\nTry a smaller number if you need the full list.\n\nSelect the ones you want to add to your library:`,
    unsafeTopic:
      'I can’t generate words for that topic. Pick a neutral, school-appropriate topic (e.g., school, work, travel).',
    clarifyTopic:
      'The topic is too broad. Please be more specific, e.g., "shopping at a store" or "office work".',
    generatedFallback: (count: number, total: number, code?: string) =>
      `I used local data (missing or invalid API key${code ? `, ${code}` : ''}).\n\nFound ${Math.min(count, total)} sample words. Configure GEMINI_API_KEY in .env.local for full functionality.`,
    generatedFallbackLimit: (count: number, total: number, code?: string) =>
      `I used local data (AI limit reached${code ? `, ${code}` : ''}).\n\nFound ${Math.min(count, total)} sample words.`,
    generatedFallbackTruncated: (count: number, total: number, code?: string) =>
      `The AI response was too long and got truncated${code ? `, ${code}` : ''}.\n\nTry a smaller word count (e.g., 8-10). I used local data and found ${Math.min(count, total)} sample words.`,
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
    imageTruncated:
      'The image contains too many words. Split your notes into smaller parts (max 20-30 words per image).',
    imageTips:
      'Tip: take the photo straight from above, avoid shadows, keep strong contrast. One section of text per photo works best.',
    imageTypeUnsupported:
      'Unsupported image format. Use JPG, PNG, or WEBP.',
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
      `Images: JPG/PNG/WEBP (up to ${maxSize} MB, auto-resized). Files: TXT, PDF, DOCX, CSV.`,
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
      { label: 'Biology', prompt: 'Generate 12 words about biology', icon: Microscope },
      { label: 'Math', prompt: 'Generate 12 words about math', icon: Calculator },
      { label: 'Geography', prompt: 'Generate 12 words about geography', icon: Globe },
      { label: 'History', prompt: 'Generate 12 words about history', icon: Landmark },
      { label: 'Literature', prompt: 'Generate 12 words about literature', icon: BookOpen },
      { label: 'Stats', prompt: 'How many words do I have?', icon: BarChart3 },
    ],
    imageButtonTitle: 'Upload notes photo',
    fileButtonTitle: 'Upload notes file',
    inputPlaceholder: 'Type words or ask...',
    assistantTitle: 'AI Assistant',
    assistantSubtitle: 'Powered by Gemini',
    selectionHint: 'Select the words you want to add to your library.',
    selectionHintOnboarding: 'After adding, pick words for the first mission.',
    minWords: (min: number) => `Required min. ${min}`,
    selectAll: 'Select all',
    deselectAll: 'Deselect',
    imageLabel: 'Photo',
    fileLabel: 'File',
  },
  uk: {
    loading: 'Завантаження...',
    welcomeMessage: (example: string) =>
      `Привіт! Я твій асистент для польської в школі й повсякденних справах у Польщі. Я можу:\n\n• Додати слова з контрольної (наприклад "${example}")\n• Згенерувати слова за темою уроку\n• Витягнути слова з фото або файлу\n• Показати статистику твоєї бібліотеки\n\nЧим можу допомогти?`,
    defaultCategory: 'Мої слова',
    defaultSetLabel: 'Новий набір',
    defaultTopic: 'школа',
    imageCategoryFallback: 'З фото',
    statsIntro: (wordCount: number, categoryCount: number) =>
      `У тебе всього **${wordCount}** слів у **${categoryCount}** категоріях:\n\n`,
    statsLine: (label: string, count: number) => `• ${label}: ${count} слів`,
    statsOutro: 'Хочеш додати більше слів?',
    generatedWords: (count: number, topic: string, level: string) =>
      `Згенерував **${count}** слів на тему "${topic}" (рівень ${level}).\n\nОбери ті, які хочеш додати до бібліотеки:`,
    generatedWordsPartial: (count: number, requested: number, topic: string, level: string) =>
      `Згенерував **${count}** з **${requested}** слів на тему "${topic}" (рівень ${level}).\n\nСпробуй меншу кількість слів, якщо потрібен повний список.\n\nОбери ті, які хочеш додати до бібліотеки:`,
    unsafeTopic:
      'Не можу згенерувати слова для цієї теми. Обери нейтральну, шкільну тему (наприклад: школа, робота, подорожі).',
    clarifyTopic:
      'Тема надто загальна. Уточни, наприклад: "покупки в магазині" або "робота в офісі".',
    generatedFallback: (count: number, total: number, code?: string) =>
      `Використав локальні дані (немає або недійсний ключ API${code ? `, ${code}` : ''}).\n\nЗнайшов ${Math.min(count, total)} прикладових слів. Налаштуй GEMINI_API_KEY в .env.local для повної функціональності.`,
    generatedFallbackLimit: (count: number, total: number, code?: string) =>
      `Використав локальні дані (ліміт AI${code ? `, ${code}` : ''}).\n\nЗнайшов ${Math.min(count, total)} прикладових слів.`,
    generatedFallbackTruncated: (count: number, total: number, code?: string) =>
      `Відповідь AI була занадто довгою і обрізалася${code ? `, ${code}` : ''}.\n\nСпробуй меншу кількість слів (наприклад, 8-10). Використав локальні дані і знайшов ${Math.min(count, total)} прикладових слів.`,
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
    imageTruncated:
      'Фото містить забагато слів. Розділи нотатки на менші частини (макс. 20-30 слів на фото).',
    imageTips:
      'Порада: знімай прямо зверху, без тіней, з чітким контрастом. Найкраще одна секція тексту на фото.',
    imageTypeUnsupported:
      'Непідтримуваний формат фото. Використай JPG, PNG або WEBP.',
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
      `Фото: JPG/PNG/WEBP (до ${maxSize} МБ, автоматично зменшуємо). Файли: TXT, PDF, DOCX, CSV.`,
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
      { label: 'Школа', prompt: 'Згенеруй 12 слів на тему школа', icon: GraduationCap },
      { label: 'Документи', prompt: 'Згенеруй 12 слів на тему документи та установи', icon: ClipboardList },
      { label: 'Лікар', prompt: 'Згенеруй 12 слів на тему лікар і здоровʼя', icon: Stethoscope },
      { label: 'Транспорт', prompt: 'Згенеруй 12 слів на тему транспорт і місто', icon: Bus },
      { label: 'Статистика', prompt: 'Скільки в мене слів?', icon: BarChart3 },
    ],
    imageButtonTitle: 'Завантажити фото нотаток',
    fileButtonTitle: 'Завантажити файл нотаток',
    inputPlaceholder: 'Введи слова або запитай...',
    assistantTitle: 'AI Асистент',
    assistantSubtitle: 'Powered by Gemini',
    selectionHint: 'Обери слова, які хочеш додати до бібліотеки.',
    selectionHintOnboarding: 'Після додавання обери слова для першої місії.',
    minWords: (min: number) => `Потрібно мін. ${min}`,
    selectAll: 'Вибрати всі',
    deselectAll: 'Зняти вибір',
    imageLabel: 'Фото',
    fileLabel: 'Файл',
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
  renderActions?: (buttons: React.ReactNode) => React.ReactNode;
  compact?: boolean;
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
  renderActions,
  compact,
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
  const isCompact = Boolean(compact && variant === 'onboarding');

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

  const prepareImageForUpload = async (file: File) => {
    const maxDimension = 3200;
    const jpegQuality = 0.9;
    const isImageFile =
      file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);

    if (!isImageFile || typeof window === 'undefined' || typeof document === 'undefined') {
      return file;
    }

    const loadImageSource = async () => {
      if (typeof createImageBitmap === 'function') {
        try {
          const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
          return {
            source: bitmap,
            width: bitmap.width,
            height: bitmap.height,
            cleanup: () => bitmap.close(),
          };
        } catch {
          try {
            const bitmap = await createImageBitmap(file);
            return {
              source: bitmap,
              width: bitmap.width,
              height: bitmap.height,
              cleanup: () => bitmap.close(),
            };
          } catch {
            // fall through to Image element
          }
        }
      }

      return new Promise<{
        source: HTMLImageElement;
        width: number;
        height: number;
        cleanup: () => void;
      }>((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({
            source: img,
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
            cleanup: () => {},
          });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load image'));
        };
        img.src = url;
      });
    };

    try {
      const { source, width, height, cleanup } = await loadImageSource();
      const scale = Math.min(1, maxDimension / Math.max(width, height));
      const shouldReencode = scale < 1 || file.type !== 'image/jpeg';
      if (!shouldReencode) {
        cleanup();
        return file;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        return file;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = 'contrast(1.1) brightness(1.02)';
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
      cleanup();

      const blob = await new Promise<Blob | null>((resolve) => {
        if (typeof canvas.toBlob !== 'function') {
          const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
          const base64 = dataUrl.split(',')[1] ?? '';
          const binary = atob(base64);
          const buffer = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) {
            buffer[i] = binary.charCodeAt(i);
          }
          resolve(new Blob([buffer], { type: 'image/jpeg' }));
          return;
        }
        canvas.toBlob(resolve, 'image/jpeg', jpegQuality);
      });

      if (!blob) return file;
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'upload';
      return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
    } catch {
      return file;
    }
  };

  const mapParsedWords = (words: ParsedWord[]) =>
    words.map((word) => ({
      ...normalizeParsedWord(word),
      selected: true,
    }));

  const applyParsedWords = (words: ParsedWord[], category: string) => {
    if (words.length === 0) return;
    setParsedWords(words);
    setSuggestedCategory(category);
    setSuggestedSetName(buildSetName(category));
    setSelectedSetOption(NEW_SET_OPTION);
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
        if (data?.error === 'response_truncated') {
          await generateWordsLocal(count, topic, 'truncated', data?.error);
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

        const requestedCount =
          typeof data.requestedCount === 'number' ? data.requestedCount : count;
        const returnedCount = data.words.length;
        const generatedMessage =
          data.warning === 'partial_result'
            ? t.generatedWordsPartial(returnedCount, requestedCount, finalTopic, level)
            : t.generatedWords(returnedCount, finalTopic, level);
        addAssistantMessage(generatedMessage);
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
    reason: 'limit' | 'config' | 'error' | 'truncated' = 'config',
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
        : reason === 'truncated'
          ? t.generatedFallbackTruncated(count, fallbackWords.length, errorCode)
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
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setIsProcessing(true);

    const collectedWords: ParsedWord[] = [];
    let suggestedCategory: string | null = null;
    let stopProcessing = false;
    let hasProcessingIssues = false;

    for (const file of files) {
      if (stopProcessing) break;

      const preparedFile = await prepareImageForUpload(file);

      if (preparedFile.size > MAX_UPLOAD_SIZE_BYTES) {
        addAssistantMessage(t.fileTooLarge(MAX_UPLOAD_SIZE_MB));
        hasProcessingIssues = true;
        continue;
      }

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
        formData.append('file', preparedFile);
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
            hasProcessingIssues = true;
            continue;
          }
          if (response.status === 415) {
            addAssistantMessage(t.imageTypeUnsupported);
            hasProcessingIssues = true;
            continue;
          }
          if (response.status === 422 && data?.error === 'response_truncated') {
            addAssistantMessage(t.imageTruncated);
            hasProcessingIssues = true;
            continue;
          }
          if (handleAiLimitError(data)) {
            stopProcessing = true;
            continue;
          }
          throw new Error('API error');
        }

        if (data.words && data.words.length > 0) {
          collectedWords.push(...mapParsedWords(data.words));
          if (!suggestedCategory) {
            suggestedCategory = data.category_suggestion || t.imageCategoryFallback;
          }
          addAssistantMessage(t.imageFound(data.words.length, data.notes));
        } else {
          addAssistantMessage(t.imageNoWords(targetLabel, nativeLabel));
          hasProcessingIssues = true;
        }
      } catch (error) {
        console.error('Image extraction error:', error);
        addAssistantMessage(t.imageError);
        hasProcessingIssues = true;
      }
    }

    if (collectedWords.length > 0) {
      const finalCategory = suggestedCategory ?? t.imageCategoryFallback;
      applyParsedWords(collectedWords, finalCategory);
    }
    if (hasProcessingIssues && collectedWords.length === 0) {
      addAssistantMessage(t.imageTips);
    }

    setIsProcessing(false);

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setIsProcessing(true);

    const collectedWords: ParsedWord[] = [];
    let suggestedCategory: string | null = null;
    let stopProcessing = false;

    for (const file of files) {
      if (stopProcessing) break;

      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        addAssistantMessage(t.fileTooLarge(MAX_UPLOAD_SIZE_MB));
        continue;
      }

      if (!isSupportedFile(file)) {
        addAssistantMessage(t.fileTypeUnsupported);
        continue;
      }

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
            continue;
          }
          if (response.status === 415) {
            addAssistantMessage(t.fileTypeUnsupported);
            continue;
          }
          if (handleAiLimitError(data)) {
            stopProcessing = true;
            continue;
          }
          throw new Error('API error');
        }

        if (data.words && data.words.length > 0) {
          collectedWords.push(...mapParsedWords(data.words));
          if (!suggestedCategory) {
            suggestedCategory = data.category_suggestion || t.defaultCategory;
          }
          addAssistantMessage(t.fileFound(data.words.length, data.notes));
        } else {
          addAssistantMessage(t.fileNoWords(targetLabel, nativeLabel));
        }
      } catch (error) {
        console.error('File extraction error:', error);
        addAssistantMessage(t.fileError);
      }
    }

    if (collectedWords.length > 0) {
      const finalCategory = suggestedCategory ?? t.defaultCategory;
      applyParsedWords(collectedWords, finalCategory);
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
    : 'pb-[calc(10rem+env(safe-area-inset-bottom))] sm:pb-[calc(12rem+env(safe-area-inset-bottom))]';
  const inputPanel = (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
        {t.quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => setInput(action.prompt)}
            className="flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
          >
            <action.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400" />
            <span className="text-[10px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 truncate w-full text-center">
              {action.label}
            </span>
          </button>
        ))}
      </div>
      <p className="text-[11px] sm:text-xs text-slate-500 mb-2">
        {t.fileSupportHint(MAX_UPLOAD_SIZE_MB)}
      </p>

      <div className="flex gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          multiple
        />
        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={isProcessing}
          className="flex items-center gap-2 p-2.5 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50"
          title={t.imageButtonTitle}
        >
          <ImageIcon size={18} className="sm:size-5" />
          <span className="hidden sm:inline text-sm">{t.imageLabel}</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,.pdf,.docx,text/plain,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileUpload}
          className="hidden"
          multiple
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="flex items-center gap-2 p-2.5 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50"
          title={t.fileButtonTitle}
        >
          <FileText size={18} className="sm:size-5" />
          <span className="hidden sm:inline text-sm">{t.fileLabel}</span>
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={t.inputPlaceholder}
          className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={isProcessing}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isProcessing}
          className="px-3 sm:px-4"
        >
          <Send size={18} className="sm:size-5" />
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
                  'max-w-[85%] rounded-2xl px-4 py-3 shadow-md',
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-primary-500 to-pink-500 text-white rounded-br-md shadow-primary-500/20'
                    : 'bg-gradient-to-br from-primary-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 text-slate-800 dark:text-slate-100 rounded-bl-md border border-primary-100 dark:border-slate-600'
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
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setParsedWords(w => w.map(x => ({ ...x, selected: true })))}
                        className="text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {t.selectAll}
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => setParsedWords(w => w.map(x => ({ ...x, selected: false })))}
                        className="text-slate-500 hover:underline"
                      >
                        {t.deselectAll}
                      </button>
                      {minWords > 1 && (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">|</span>
                          <span>{t.minWords(minWords)}</span>
                        </>
                      )}
                    </div>
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

        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 md:left-24 md:bottom-8 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-3 sm:p-4">
          <div className="max-w-3xl mx-auto">
            {parsedWords.length > 0 ? (
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" onClick={cancelWords} className="flex-1">
                  <X size={16} className="mr-2 sm:size-4" />
                  {t.cancel}
                </Button>
                <Button size="sm" onClick={addSelectedWords} className="flex-1" disabled={!canAddWords}>
                  <Plus size={16} className="mr-2 sm:size-4" />
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
    <div
      className={cn(
        'grid md:grid-cols-[1.2fr_1fr] pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0',
        isCompact ? 'gap-3 sm:gap-4' : 'gap-4 sm:gap-6',
        className
      )}
    >
      <div className={cn('min-w-0 space-y-4', isCompact && 'space-y-3')}>
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

        <div
          className={cn(
            'rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 overflow-y-auto',
            isCompact
              ? 'p-3 max-h-32 sm:max-h-64 space-y-2'
              : 'p-4 max-h-64 space-y-3'
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
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-md',
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-primary-500 to-pink-500 text-white rounded-br-md shadow-primary-500/20'
                    : 'bg-gradient-to-br from-primary-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 text-slate-800 dark:text-slate-100 rounded-bl-md border border-primary-100 dark:border-slate-600'
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

        <div className={cn('space-y-3', isCompact && 'space-y-2')}>
          <div className={cn('grid gap-2', isCompact ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-5')}>
            {t.quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => setInput(action.prompt)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
              >
                <action.icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate w-full text-center">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
          <p className={cn('text-xs text-slate-500', isCompact && 'leading-snug')}>
            {t.fileSupportHint(MAX_UPLOAD_SIZE_MB)}
          </p>
          <div className={cn('flex gap-2 min-w-0', isCompact && 'gap-1.5')}>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              multiple
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center gap-2 p-2.5 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50 flex-shrink-0"
              title={t.imageButtonTitle}
            >
              <ImageIcon size={20} />
              <span className="hidden sm:inline text-sm">{t.imageLabel}</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv,.pdf,.docx,text/plain,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileUpload}
              className="hidden"
              multiple
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center gap-2 p-2.5 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50 flex-shrink-0"
              title={t.fileButtonTitle}
            >
              <FileText size={20} />
              <span className="hidden sm:inline text-sm">{t.fileLabel}</span>
            </button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t.inputPlaceholder}
              className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isProcessing}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="px-3 sm:px-4"
            >
              <Send size={18} />
            </Button>
          </div>
        </div>
      </div>

      <div className={cn('min-w-0 space-y-4', isCompact && 'space-y-3')}>
        <div
          className={cn(
            'rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
            isCompact ? 'p-3 space-y-2' : 'p-4 space-y-3'
          )}
        >
          <p className="text-xs text-slate-500">{selectionHint}</p>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{t.selectedCount(selectedWordCount)}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setParsedWords(w => w.map(x => ({ ...x, selected: true })))}
                className="text-primary-600 dark:text-primary-400 hover:underline"
              >
                {t.selectAll}
              </button>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <button
                type="button"
                onClick={() => setParsedWords(w => w.map(x => ({ ...x, selected: false })))}
                className="text-slate-500 hover:underline"
              >
                {t.deselectAll}
              </button>
              {minWords > 1 && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <span>{t.minWords(minWords)}</span>
                </>
              )}
            </div>
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

        <div
          className={cn(
            'rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto',
            isCompact
              ? 'p-2.5 space-y-2 max-h-40 sm:max-h-64'
              : 'p-3 space-y-2 max-h-64'
          )}
        >
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

        {renderActions ? (
          renderActions(
            <>
              <Button
                variant="secondary"
                onClick={cancelWords}
                className="md:flex-initial flex-1 min-w-[140px]"
              >
                <X size={18} className="mr-2" />
                {t.cancel}
              </Button>
              <Button
                onClick={addSelectedWords}
                className="md:flex-initial flex-1 min-w-[140px]"
                disabled={!canAddWords}
              >
                <Plus size={18} className="mr-2" />
                {addLabel}
              </Button>
            </>
          )
        ) : (
          <>
            <div className="hidden md:flex gap-3">
              <Button variant="secondary" onClick={cancelWords} className="flex-1">
                <X size={18} className="mr-2" />
                {t.cancel}
              </Button>
              <Button onClick={addSelectedWords} className="flex-1" disabled={!canAddWords}>
                <Plus size={18} className="mr-2" />
                {addLabel}
              </Button>
            </div>

            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-50">
              <div className="flex gap-3 max-w-4xl mx-auto">
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
          </>
        )}
      </div>
    </div>
  );
}

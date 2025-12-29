import type { AppLanguage } from '@/lib/i18n';
import type { LearningPairId } from '@/types';

export type StarterWord = {
  target: string;
  native: string;
};

export type StarterPack = {
  id: string;
  pairId: LearningPairId;
  title: Record<AppLanguage, string>;
  description: Record<AppLanguage, string>;
  category: Record<AppLanguage, string>;
  words: StarterWord[];
};

export const starterPacks: StarterPack[] = [
  {
    id: 'pl-en-biology',
    pairId: 'pl-en',
    title: {
      pl: 'Biologia: komórka i organizm',
      en: 'Biology: cell and organism',
      uk: 'Біологія: клітина і організм',
    },
    description: {
      pl: 'Najważniejsze słówka z biologii na lekcje i kartkówki.',
      en: 'Core biology vocabulary for classes and tests.',
      uk: 'Ключові слова з біології для уроків і контрольних.',
    },
    category: {
      pl: 'Biologia',
      en: 'Biology',
      uk: 'Біологія',
    },
    words: [
      { target: 'cell', native: 'komórka' },
      { target: 'nucleus', native: 'jądro' },
      { target: 'membrane', native: 'błona' },
      { target: 'tissue', native: 'tkanka' },
      { target: 'organ', native: 'narząd' },
      { target: 'organism', native: 'organizm' },
      { target: 'photosynthesis', native: 'fotosynteza' },
      { target: 'respiration', native: 'oddychanie' },
      { target: 'microscope', native: 'mikroskop' },
    ],
  },
  {
    id: 'pl-en-geography',
    pairId: 'pl-en',
    title: {
      pl: 'Geografia: mapa i klimat',
      en: 'Geography: map and climate',
      uk: 'Географія: карта і клімат',
    },
    description: {
      pl: 'Słówka z geografii przydatne na sprawdzian.',
      en: 'Geography words useful for a test.',
      uk: 'Географічна лексика для контрольної.',
    },
    category: {
      pl: 'Geografia',
      en: 'Geography',
      uk: 'Географія',
    },
    words: [
      { target: 'map', native: 'mapa' },
      { target: 'continent', native: 'kontynent' },
      { target: 'river', native: 'rzeka' },
      { target: 'mountain', native: 'góra' },
      { target: 'valley', native: 'dolina' },
      { target: 'climate', native: 'klimat' },
      { target: 'forest', native: 'las' },
      { target: 'desert', native: 'pustynia' },
      { target: 'coast', native: 'wybrzeże' },
      { target: 'island', native: 'wyspa' },
    ],
  },
  {
    id: 'pl-en-math',
    pairId: 'pl-en',
    title: {
      pl: 'Matematyka: podstawy',
      en: 'Math: basics',
      uk: 'Математика: основи',
    },
    description: {
      pl: 'Słówka z matematyki do zadań i kartkówek.',
      en: 'Math vocabulary for homework and quizzes.',
      uk: 'Математична лексика для домашніх завдань.',
    },
    category: {
      pl: 'Matematyka',
      en: 'Math',
      uk: 'Математика',
    },
    words: [
      { target: 'fraction', native: 'ułamek' },
      { target: 'equation', native: 'równanie' },
      { target: 'angle', native: 'kąt' },
      { target: 'triangle', native: 'trójkąt' },
      { target: 'square', native: 'kwadrat' },
      { target: 'rectangle', native: 'prostokąt' },
      { target: 'perimeter', native: 'obwód' },
      { target: 'area', native: 'pole' },
      { target: 'average', native: 'średnia' },
      { target: 'percentage', native: 'procent' },
    ],
  },
  {
    id: 'pl-en-literature',
    pairId: 'pl-en',
    title: {
      pl: 'Lektury: analiza tekstu',
      en: 'Literature: text analysis',
      uk: 'Література: аналіз тексту',
    },
    description: {
      pl: 'Słowa potrzebne do omawiania lektur.',
      en: 'Words used when discussing readings.',
      uk: 'Слова для обговорення літератури.',
    },
    category: {
      pl: 'Lektury',
      en: 'Literature',
      uk: 'Література',
    },
    words: [
      { target: 'chapter', native: 'rozdział' },
      { target: 'narrator', native: 'narrator' },
      { target: 'character', native: 'bohater' },
      { target: 'plot', native: 'fabuła' },
      { target: 'dialogue', native: 'dialog' },
      { target: 'metaphor', native: 'metafora' },
      { target: 'poem', native: 'wiersz' },
      { target: 'author', native: 'autor' },
      { target: 'title', native: 'tytuł' },
      { target: 'summary', native: 'streszczenie' },
    ],
  },
  {
    id: 'uk-pl-office',
    pairId: 'uk-pl',
    title: {
      pl: 'Urząd i dokumenty',
      en: 'Office and documents',
      uk: 'Установа і документи',
    },
    description: {
      pl: 'Polski do spraw urzędowych i dokumentów.',
      en: 'Polish for offices and documents.',
      uk: 'Польська для установ і документів.',
    },
    category: {
      pl: 'Urząd',
      en: 'Office',
      uk: 'Установа',
    },
    words: [
      { target: 'wniosek', native: 'заява' },
      { target: 'urząd', native: 'установа' },
      { target: 'dokument', native: 'документ' },
      { target: 'podpis', native: 'підпис' },
      { target: 'termin', native: 'термін' },
      { target: 'opłata', native: 'оплата' },
      { target: 'formularz', native: 'бланк' },
      { target: 'załącznik', native: 'додаток' },
    ],
  },
  {
    id: 'uk-pl-school',
    pairId: 'uk-pl',
    title: {
      pl: 'Szkoła na co dzień',
      en: 'School every day',
      uk: 'Школа щодня',
    },
    description: {
      pl: 'Słówka potrzebne w polskiej szkole.',
      en: 'Words used in a Polish school.',
      uk: 'Слова для навчання в польській школі.',
    },
    category: {
      pl: 'Szkoła',
      en: 'School',
      uk: 'Школа',
    },
    words: [
      { target: 'lekcja', native: 'урок' },
      { target: 'nauczyciel', native: 'вчитель' },
      { target: 'uczeń', native: 'учень' },
      { target: 'zeszyt', native: 'зошит' },
      { target: 'przerwa', native: 'перерва' },
      { target: 'ocena', native: 'оцінка' },
      { target: 'zadanie domowe', native: 'домашнє завдання' },
      { target: 'dziennik', native: 'щоденник' },
      { target: 'klasa', native: 'клас' },
    ],
  },
  {
    id: 'uk-pl-health',
    pairId: 'uk-pl',
    title: {
      pl: 'Zdrowie i lekarz',
      en: 'Health and doctor',
      uk: 'Здоровʼя і лікар',
    },
    description: {
      pl: 'Słówka do wizyty u lekarza i w aptece.',
      en: 'Words for a doctor visit and pharmacy.',
      uk: 'Слова для візиту до лікаря та аптеки.',
    },
    category: {
      pl: 'Zdrowie',
      en: 'Health',
      uk: 'Здоровʼя',
    },
    words: [
      { target: 'lekarz', native: 'лікар' },
      { target: 'wizyta', native: 'візит' },
      { target: 'recepta', native: 'рецепт' },
      { target: 'objaw', native: 'симптом' },
      { target: 'ból', native: 'біль' },
      { target: 'apteka', native: 'аптека' },
      { target: 'temperatura', native: 'температура' },
      { target: 'ubezpieczenie', native: 'страхування' },
    ],
  },
  {
    id: 'uk-pl-housing',
    pairId: 'uk-pl',
    title: {
      pl: 'Mieszkanie i rachunki',
      en: 'Housing and bills',
      uk: 'Житло і рахунки',
    },
    description: {
      pl: 'Słówka do rozmów o mieszkaniu i opłatach.',
      en: 'Words for talking about housing and bills.',
      uk: 'Слова про житло та оплату рахунків.',
    },
    category: {
      pl: 'Mieszkanie',
      en: 'Housing',
      uk: 'Житло',
    },
    words: [
      { target: 'wynajem', native: 'оренда' },
      { target: 'umowa', native: 'договір' },
      { target: 'czynsz', native: 'квартплата' },
      { target: 'rachunek', native: 'рахунок' },
      { target: 'klucz', native: 'ключ' },
      { target: 'pokój', native: 'кімната' },
      { target: 'kuchnia', native: 'кухня' },
      { target: 'łazienka', native: 'ванна кімната' },
      { target: 'adres', native: 'адрес' },
    ],
  },
];

export const getStarterPacksForPair = (pairId: LearningPairId) =>
  starterPacks.filter((pack) => pack.pairId === pairId);

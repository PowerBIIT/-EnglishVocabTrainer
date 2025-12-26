const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const buildSeedState = () => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const isoNow = now.toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const vocabulary = [
    {
      id: 'vocab-apple',
      en: 'apple',
      phonetic: '/ap-uhl/',
      pl: 'jablko',
      category: 'Food',
      setIds: ['set-basics'],
      example_en: 'I ate an apple.',
      example_pl: 'Zjadlem jablko.',
      difficulty: 'easy',
      created_at: isoNow,
      source: 'manual',
      languagePair: 'pl-en',
    },
    {
      id: 'vocab-bread',
      en: 'bread',
      phonetic: '/bred/',
      pl: 'chleb',
      category: 'Food',
      setIds: ['set-basics'],
      example_en: 'This bread is fresh.',
      example_pl: 'Ten chleb jest swiezy.',
      difficulty: 'easy',
      created_at: isoNow,
      source: 'manual',
      languagePair: 'pl-en',
    },
    {
      id: 'vocab-ticket',
      en: 'ticket',
      phonetic: '/tik-it/',
      pl: 'bilet',
      category: 'Travel',
      setIds: ['set-travel'],
      example_en: 'I bought a ticket.',
      example_pl: 'Kupilem bilet.',
      difficulty: 'medium',
      created_at: isoNow,
      source: 'manual',
      languagePair: 'pl-en',
    },
    {
      id: 'vocab-hotel',
      en: 'hotel',
      phonetic: '/ho-tel/',
      pl: 'hotel',
      category: 'Travel',
      setIds: ['set-travel'],
      example_en: 'The hotel is near the station.',
      example_pl: 'Hotel jest blisko stacji.',
      difficulty: 'medium',
      created_at: isoNow,
      source: 'manual',
      languagePair: 'pl-en',
    },
    {
      id: 'vocab-cold',
      en: 'cold',
      phonetic: '/kold/',
      pl: 'przeziebienie',
      category: 'Health Problems',
      setIds: ['set-health'],
      example_en: 'I have a cold.',
      example_pl: 'Mam przeziebienie.',
      difficulty: 'easy',
      created_at: isoNow,
      source: 'manual',
      languagePair: 'pl-en',
    },
    {
      id: 'vocab-pain',
      en: 'pain',
      phonetic: '/pein/',
      pl: 'bol',
      category: 'Health Problems',
      setIds: ['set-health'],
      example_en: 'I feel pain in my back.',
      example_pl: 'Czuje bol w plecach.',
      difficulty: 'hard',
      created_at: isoNow,
      source: 'manual',
      languagePair: 'pl-en',
    },
  ];

  const sets = [
    {
      id: 'set-basics',
      name: 'Basics',
      createdAt: isoNow,
      languagePair: 'pl-en',
    },
    {
      id: 'set-travel',
      name: 'Travel',
      createdAt: isoNow,
      languagePair: 'pl-en',
    },
    {
      id: 'set-health',
      name: 'Health',
      createdAt: isoNow,
      languagePair: 'pl-en',
    },
  ];

  const progress = {
    'vocab-apple': {
      vocab_id: 'vocab-apple',
      times_seen: 4,
      times_correct: 4,
      times_wrong: 0,
      avg_pronunciation_score: 8.5,
      pronunciation_attempts: 2,
      last_seen: isoNow,
      next_review: tomorrow,
      status: 'mastered',
      pronunciationHistory: [
        {
          id: 'pron-apple-1',
          vocab_id: 'vocab-apple',
          timestamp: isoNow,
          score: 8.2,
          recognizedText: 'apple',
          expectedWord: 'apple',
        },
      ],
    },
    'vocab-bread': {
      vocab_id: 'vocab-bread',
      times_seen: 3,
      times_correct: 2,
      times_wrong: 1,
      avg_pronunciation_score: 6.4,
      pronunciation_attempts: 1,
      last_seen: isoNow,
      next_review: tomorrow,
      status: 'learning',
    },
    'vocab-ticket': {
      vocab_id: 'vocab-ticket',
      times_seen: 1,
      times_correct: 0,
      times_wrong: 1,
      avg_pronunciation_score: 0,
      pronunciation_attempts: 0,
      last_seen: isoNow,
      next_review: tomorrow,
      status: 'new',
    },
    'vocab-hotel': {
      vocab_id: 'vocab-hotel',
      times_seen: 2,
      times_correct: 1,
      times_wrong: 1,
      avg_pronunciation_score: 7.1,
      pronunciation_attempts: 1,
      last_seen: isoNow,
      next_review: tomorrow,
      status: 'learning',
    },
    'vocab-cold': {
      vocab_id: 'vocab-cold',
      times_seen: 5,
      times_correct: 5,
      times_wrong: 0,
      avg_pronunciation_score: 9.1,
      pronunciation_attempts: 3,
      last_seen: isoNow,
      next_review: tomorrow,
      status: 'mastered',
    },
    'vocab-pain': {
      vocab_id: 'vocab-pain',
      times_seen: 1,
      times_correct: 0,
      times_wrong: 1,
      avg_pronunciation_score: 5.2,
      pronunciation_attempts: 1,
      last_seen: isoNow,
      next_review: tomorrow,
      status: 'learning',
    },
  };

  const settings = {
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
      targetPhoneme: null,
      adaptiveDifficulty: true,
      showPhonemeHints: true,
    },
    general: {
      language: 'en',
      theme: 'auto',
      sounds: true,
      notifications: false,
      offlineMode: false,
    },
    ai: {
      feedbackDetail: 'detailed',
      feedbackLanguage: 'en',
      phoneticHints: true,
    },
    learning: {
      nativeLanguage: 'pl',
      targetLanguage: 'en',
      pairId: 'pl-en',
    },
  };

  const stats = {
    totalXp: 180,
    level: 2,
    currentStreak: 3,
    longestStreak: 5,
    totalWordsLearned: 6,
    totalSessionsCompleted: 4,
    totalTimeSpent: 95,
    lastSessionDate: isoNow,
    badges: [
      {
        id: 'streak_7',
        name: '7-day streak',
        description: 'A full week of learning without a break!',
        icon: 'flame',
        earnedAt: isoNow,
      },
    ],
    pronunciationStreak: 2,
    longestPronunciationStreak: 3,
    totalPronunciationSessions: 2,
    averagePronunciationScore: 7.4,
    phonemeMastery: {
      th_voiceless: 40,
      th_voiced: 35,
      schwa: 55,
    },
    lastPronunciationDate: isoNow,
  };

  const dailyMission = {
    id: `${today}-flashcards-seed`,
    date: today,
    type: 'flashcards',
    title: 'Flashcard Sprint',
    description: 'Mark 5 flashcards as "I know".',
    target: 5,
    progress: 2,
    rewardXp: 40,
    completed: false,
  };

  return {
    vocabulary,
    sets,
    progress,
    settings,
    stats,
    dailyMission,
  };
};

async function main() {
  const email = process.env.SEED_EMAIL || 'seed@local.test';
  const name = process.env.SEED_NAME || 'Seed User';
  const state = buildSeedState();

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      onboardingComplete: true,
      mascotSkin: 'explorer',
    },
    create: {
      email,
      name,
      onboardingComplete: true,
      mascotSkin: 'explorer',
    },
  });

  await prisma.userPlan.upsert({
    where: { userId: user.id },
    update: {
      plan: 'FREE',
      accessStatus: 'ACTIVE',
    },
    create: {
      userId: user.id,
      plan: 'FREE',
      accessStatus: 'ACTIVE',
    },
  });

  await prisma.userState.upsert({
    where: { userId: user.id },
    update: { data: state },
    create: {
      userId: user.id,
      data: state,
    },
  });

  console.log(`Seeded user ${email} with sample state.`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

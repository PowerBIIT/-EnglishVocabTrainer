type NormalizeOptions = {
  language?: string;
  stripArticles?: boolean;
};

export function normalizePronunciationText(
  text: string,
  options: NormalizeOptions = {}
): string {
  const stripArticles =
    options.stripArticles ?? options.language?.toLowerCase() === 'en';

  let normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (stripArticles) {
    normalized = normalized.replace(/^(a|an|the)\s+/i, '');
  }

  return normalized;
}

export function calculatePronunciationScore(
  expected: string,
  spoken: string,
  options: NormalizeOptions = {}
): {
  score: number;
  similarity: number;
  expectedNormalized: string;
  spokenNormalized: string;
} {
  const expectedNormalized = normalizePronunciationText(expected, options);
  const spokenNormalized = normalizePronunciationText(spoken, options);

  const similarity = calculateCompositeSimilarity(
    expectedNormalized,
    spokenNormalized
  );
  const score = Math.max(1, Math.min(10, Math.round(similarity * 10)));

  return {
    score,
    similarity,
    expectedNormalized,
    spokenNormalized,
  };
}

const calculateCompositeSimilarity = (expected: string, spoken: string): number => {
  const charSimilarity = calculateCharSimilarity(expected, spoken);
  const tokenSimilarity = calculateTokenSimilarity(expected, spoken);

  if (!expected || !spoken) {
    return expected === spoken ? 1 : 0;
  }

  const expectedTokens = expected.split(' ').filter(Boolean);
  const spokenTokens = spoken.split(' ').filter(Boolean);

  if (expectedTokens.length <= 1 && spokenTokens.length <= 1) {
    return charSimilarity;
  }

  return charSimilarity * 0.7 + tokenSimilarity * 0.3;
};

const calculateCharSimilarity = (expected: string, spoken: string): number => {
  const longer = expected.length >= spoken.length ? expected : spoken;
  const shorter = expected.length >= spoken.length ? spoken : expected;
  if (longer.length === 0) return 1;
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
};

const calculateTokenSimilarity = (expected: string, spoken: string): number => {
  const expectedTokens = expected.split(' ').filter(Boolean);
  const spokenTokens = spoken.split(' ').filter(Boolean);
  if (expectedTokens.length === 0 && spokenTokens.length === 0) return 1;
  if (expectedTokens.length === 0 || spokenTokens.length === 0) return 0;

  const lcs = lcsLength(expectedTokens, spokenTokens);
  return lcs / Math.max(expectedTokens.length, spokenTokens.length);
};

const lcsLength = (a: string[], b: string[]): number => {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
};

const levenshteinDistance = (str1: string, str2: string): number => {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;
      }
    }
  }
  return dp[m][n];
};

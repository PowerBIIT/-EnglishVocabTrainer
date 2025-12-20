// Gemini API Service Layer

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-1.5-flash';

interface GeminiResponse {
  candidates?: {
    content: {
      parts: { text: string }[];
    };
  }[];
  error?: {
    message: string;
    code: number;
  };
}

interface GenerateOptions {
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
}

export class GeminiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(
    prompt: string,
    options: GenerateOptions = {}
  ): Promise<string> {
    const {
      temperature = 0.7,
      maxOutputTokens = 1024,
      model = DEFAULT_MODEL,
    } = options;

    const response = await fetch(
      `${GEMINI_API_URL}/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            maxOutputTokens,
          },
        }),
      }
    );

    const data: GeminiResponse = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('No response from Gemini');
    }

    return data.candidates[0].content.parts[0].text;
  }

  async generateWithImage(
    prompt: string,
    imageBase64: string,
    mimeType: string = 'image/jpeg',
    options: GenerateOptions = {}
  ): Promise<string> {
    const {
      temperature = 0.7,
      maxOutputTokens = 1024,
      model = DEFAULT_MODEL,
    } = options;

    const response = await fetch(
      `${GEMINI_API_URL}/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature,
            maxOutputTokens,
          },
        }),
      }
    );

    const data: GeminiResponse = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('No response from Gemini');
    }

    return data.candidates[0].content.parts[0].text;
  }
}

// AI Prompts for different functions
export const AI_PROMPTS = {
  evaluatePronunciation: (expected: string, phonetic: string, spoken: string) => `
Jesteś nauczycielem angielskiego oceniającym wymowę polskiego ucznia.

Słówko do wymówienia: "${expected}"
Transkrypcja IPA: "${phonetic}"
Uczeń powiedział (rozpoznane przez STT): "${spoken}"

Oceń wymowę 1-10 biorąc pod uwagę:
- Czy słowo jest rozpoznawalne
- Czy kluczowe dźwięki są poprawne
- Typowe błędy Polaków (th, w/v, r, schwa)

Odpowiedz TYLKO w formacie JSON (bez markdown, bez \`\`\`):
{
  "score": <1-10>,
  "correct": <true jeśli score >= 7>,
  "feedback": "<feedback po polsku, max 2 zdania>",
  "tip": "<konkretna wskazówka fonetyczna, np. 'Dźwięk th - włóż język między zęby'>"
}`,

  generateWords: (topic: string, count: number, level: string) => `
Wygeneruj ${count} słówek angielskich na temat: ${topic}
Poziom: ${level} (A1/A2/B1/B2)

Dla każdego słówka podaj:
- en: słówko/fraza angielska
- phonetic: transkrypcja IPA (poprawna!)
- pl: polskie tłumaczenie
- example_en: krótkie przykładowe zdanie po angielsku
- example_pl: tłumaczenie zdania
- difficulty: easy/medium/hard

Odpowiedz TYLKO w formacie JSON (bez markdown, bez \`\`\`):
{
  "topic": "${topic}",
  "level": "${level}",
  "words": [
    {
      "en": "...",
      "phonetic": "/.../"  ,
      "pl": "...",
      "example_en": "...",
      "example_pl": "...",
      "difficulty": "easy|medium|hard"
    }
  ]
}`,

  parseText: (userInput: string) => `
Użytkownik wpisał słówka w różnym formacie. Sparsuj je i ustrukturyzuj.

Wejście użytkownika:
"${userInput}"

Rozpoznaj słówka angielskie i ich polskie tłumaczenia.
Wygeneruj poprawną transkrypcję fonetyczną IPA dla każdego słówka.

Odpowiedz TYLKO w formacie JSON (bez markdown, bez \`\`\`):
{
  "words": [
    {"en": "...", "phonetic": "/.../" , "pl": "...", "difficulty": "easy|medium|hard"}
  ],
  "category_suggestion": "sugerowana kategoria",
  "parse_errors": ["lista słów których nie udało się sparsować"]
}`,

  extractFromImage: () => `
Jesteś asystentem do nauki angielskiego. Przeanalizuj zdjęcie notatek ucznia i wyciągnij wszystkie słówka angielskie z tłumaczeniami.

Dla każdego słówka zwróć:
- en: słówko angielskie
- phonetic: transkrypcja IPA (jeśli jest na zdjęciu, użyj jej; jeśli nie - wygeneruj poprawną)
- pl: polskie tłumaczenie

Odpowiedz TYLKO w formacie JSON (bez markdown, bez \`\`\`):
{
  "category_suggestion": "sugerowana nazwa kategorii na podstawie słówek",
  "words": [
    {"en": "...", "phonetic": "/.../" , "pl": "...", "difficulty": "easy|medium|hard"}
  ],
  "notes": "dodatkowe uwagi jeśli coś było nieczytelne"
}`,

  tutorChat: (context: string, userMessage: string) => `
Jesteś przyjaznym AI tutorem do nauki angielskiego dla polskich uczniów (poziom A1-B2).
Nazywasz się "Eva" (English Vocabulary Assistant).

Kontekst ucznia:
${context}

Wiadomość ucznia: "${userMessage}"

Zasady:
1. Odpowiadaj po polsku, ale używaj angielskich przykładów
2. Bądź zachęcający i cierpliwy
3. Jeśli uczeń pyta o słówko, podaj wymowę IPA i przykład użycia
4. Możesz proponować ćwiczenia lub quizy
5. Koryguj błędy delikatnie
6. Używaj emoji dla lepszego UX

Odpowiedz naturalnie, jak pomocny nauczyciel.`,

  explainWord: (word: string) => `
Wyjaśnij szczegółowo słówko angielskie: "${word}"

Podaj:
1. Wymowę IPA
2. Wszystkie znaczenia z tłumaczeniem
3. 3 przykłady użycia (z tłumaczeniem)
4. Synonimy
5. Typowe błędy Polaków
6. Wskazówkę do zapamiętania

Odpowiedz po polsku w przyjaznym tonie, używaj emoji.`,
};

// Helper to safely parse JSON from AI response
export function parseAIResponse<T>(response: string): T {
  // Remove markdown code blocks if present
  let cleaned = response.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  return JSON.parse(cleaned);
}

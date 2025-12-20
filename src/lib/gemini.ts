// Gemini API Service Layer

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.0-flash';

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
Jesteś ekspertem fonetyki angielskiej oceniającym wymowę POLSKIEGO ucznia.

Słówko do wymówienia: "${expected}"
Transkrypcja IPA: "${phonetic}"
Uczeń powiedział (rozpoznane przez STT): "${spoken}"

ZADANIE: Przeprowadź szczegółową analizę fonetyczną.

TYPOWE BŁĘDY POLAKÓW - szukaj ich aktywnie:
1. /θ/ (th bezdźwięczne) - Polacy wymawiają jako "t" lub "f" (think → tink/fink)
2. /ð/ (th dźwięczne) - Polacy wymawiają jako "d" lub "v" (this → dis/vis)
3. /w/ - Polacy wymawiają jako "v" (water → vater, wine → vine)
4. /r/ - Polacy używają r drżącego zamiast angielskiego retroflex
5. /ə/ (schwa) - Polacy wymawiają pełne samogłoski zamiast zredukowanej szwy
6. /ɪ/ vs /iː/ - Polacy nie rozróżniają ship/sheep
7. /ʊ/ vs /uː/ - Polacy nie rozróżniają full/fool
8. /ŋ/ - Polacy dodają twarde "g" (singing → singing-g)
9. Końcowe zbitki spółgłosek (-sts, -sks) - Polacy upraszczają lub dodają samogłoskę

OCENA (1-10):
- 9-10: Wymowa natywna lub prawie natywna
- 7-8: Dobra wymowa, drobne błędy nie wpływające na zrozumienie
- 5-6: Zrozumiała, ale z wyraźnymi błędami
- 3-4: Trudna do zrozumienia
- 1-2: Niezrozumiała

Odpowiedz TYLKO w formacie JSON (bez markdown, bez \`\`\`):
{
  "score": <1-10>,
  "correct": <true jeśli score >= 7>,
  "feedback": "<feedback po polsku, max 2 zdania, zachęcający ton>",
  "tip": "<KONKRETNA wskazówka JAK poprawić, np. 'Przy th włóż język między zęby i wydmuchuj powietrze'>",
  "errorPhonemes": ["lista błędnych fonemów, np. 'th', 'w', 'schwa'"],
  "phonemeAnalysis": [
    {"phoneme": "<fonem IPA>", "correct": <true/false>, "issue": "<opis problemu jeśli błąd>"}
  ],
  "polishInterference": "<który polski nawyk spowodował błąd, jeśli wykryto>"
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
  let cleaned = response.trim();

  // Remove markdown code blocks (```json or ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');

  // Handle cases where Gemini adds explanation text before/after JSON
  // Find the first { and last } to extract just the JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  cleaned = cleaned.trim();

  if (!cleaned) {
    throw new Error('Empty response after cleanup');
  }

  try {
    return JSON.parse(cleaned);
  } catch (parseError) {
    // Log the problematic response for debugging
    console.error('Failed to parse Gemini response as JSON:');
    console.error('Original:', response);
    console.error('Cleaned:', cleaned);
    throw new Error(
      `Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'unknown error'}`
    );
  }
}

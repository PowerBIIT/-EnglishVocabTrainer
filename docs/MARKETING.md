# Plan Promocji Henio

## Podsumowanie

| Parametr | Wartość |
|----------|---------|
| **Data** | 6 stycznia 2026 |
| **Landing** | https://henio.app |
| **Ceny** | 19.99 PLN/mies, 149.99 PLN/rok |
| **Trial** | 7 dni za darmo (bez karty) |
| **Budżet Google Ads** | 50 PLN/dzień (~1500 PLN/mies) |

---

## ZASADA #1: NIE KŁAMIEMY O CENIE

**Henio NIE JEST darmową aplikacją!**

| ✅ PRAWIDŁOWO | ❌ BŁĘDNIE |
|---------------|-----------|
| "7 dni za darmo" | "darmowa aplikacja" |
| "trial bez karty" | "za darmo" |
| "wypróbuj za darmo przez 7 dni" | "free app" |

**Zawsze:** "7-dniowy darmowy trial, potem 19.99 PLN/mies"

---

# GOOGLE ADS

## Konto

| Parametr | Wartość |
|----------|---------|
| **Account ID** | AW-17853999994 |
| **Email** | radekbroniszewski@gmail.com |
| **Conversion ID** | TAKeCJW8nN0bEPrWucFC |
| **Panel** | https://ads.google.com |

## Tracking (wdrożony ✅)

- Tag gtag.js w `src/app/layout.tsx`
- Konwersja śledzona w:
  - `src/app/onboarding/page.tsx` - nowy użytkownik kończy onboarding (Google OAuth + email)
  - `src/app/register/page.tsx` - rejestracja email/password
- Zmienne w GitHub Actions (build-time):
  - `NEXT_PUBLIC_GOOGLE_ADS_ID=AW-17853999994`
  - `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID=TAKeCJW8nN0bEPrWucFC`

## Kampanie

### UA-PL Nauka polskiego ✅ AKTYWNA

| Parametr | Wartość |
|----------|---------|
| **Typ** | Search |
| **Lokalizacja** | Polska |
| **Języki** | polski + ukraiński |
| **Budżet** | 25 PLN/dzień |
| **Stawki** | Maksymalizuj konwersje |
| **Start** | 6.01.2026 |

**Słowa kluczowe:**
- nauka polskiego dla ukraińców
- польська мова онлайн
- вивчити польську
- nauka języka polskiego online
- aplikacja do nauki polskiego
- polski dla obcokrajowców
- fiszki polskie słówka
- польські слова
- słownictwo polskie dla ukraińców
- картки польська мова

**Reklama:**
- Nagłówki: Вивчай польську з AI | Фото → Фішки за 5 хв | 7 днів безкоштовно | Nauka polskiego z AI | Aplikacja Henio | Польська без стресу
- Opisy: Сфотографуй зошит, отримай картки. Тренуй вимову з AI. Квізи. | Zrób zdjęcie tekstu, AI stworzy fiszki. Trening wymowy. Quizy.

### PL-EN Nauka angielskiego ✅ AKTYWNA

| Parametr | Wartość |
|----------|---------|
| **Typ** | Search |
| **Lokalizacja** | Polska |
| **Języki** | polski + angielski |
| **Budżet** | 25 PLN/dzień |
| **Stawki** | Maksymalizuj konwersje |
| **Start** | 6.01.2026 |

**Słowa kluczowe:**
- nauka angielskiego online
- aplikacja do nauki angielskiego
- angielski za darmo
- nauka słówek angielskich
- fiszki angielskie
- matura angielski 2025
- angielski do pracy

**Reklama:**
- Nagłówki: Angielski z AI - 5 min/dzień | Fiszki ze zdjęcia notatek | 7 dni za darmo | Matura 2025 - Angielski | Ucz się słówek z AI | Nauka angielskiego z AI
- Opisy: Zrób zdjęcie tekstu, AI stworzy fiszki. Trening wymowy z oceną. | Idealne na maturę i do pracy. Wypróbuj Henio za darmo!

## Ostrzeżenia Google Ads (normalne dla nowych kampanii)

| Ostrzeżenie | Co znaczy | Akcja |
|-------------|-----------|-------|
| "Brakuje tagu Google" | Google jeszcze nie zweryfikował | Poczekaj 24-48h |
| "Skuteczność reklamy niska" | Za mało danych | Poczekaj 7 dni |
| "Reklama ograniczona (zasady)" | Ukraińskie znaki | Działa w Polsce, OK |
| "Brak kierowania na trafne wyszukiwania" | AI się uczy | Poczekaj 7 dni |
| "Strategia w trakcie nauki" | AI optymalizuje | Poczekaj 7-14 dni |

**Wszystkie ostrzeżenia znikną same po 1-2 tygodniach.**

## Monitoring kampanii

### Gdzie sprawdzać:
1. https://ads.google.com → Kampanie

### Co sprawdzać (codziennie przez tydzień 1):

| Metryka | Dobry wynik |
|---------|-------------|
| Wyświetlenia | > 100/dzień |
| Kliknięcia | > 10/dzień |
| CTR | > 3% |
| Koszt | ≤ 25 zł/kampania |
| Konwersje | > 1/dzień |

### Czerwone flagi:
- CTR < 1% przez 3 dni → zmień nagłówki
- 0 konwersji przez 5 dni → sprawdź tracking
- Koszt/konwersja > 20 zł → zmień słowa kluczowe

### Kiedy pauzować:
- Koszt/konwersja > 30 zł
- CTR < 0.5% przez tydzień
- Brak konwersji przez 7 dni

### Jak pauzować:
Kampanie → kliknij niebieski przełącznik → szary = wstrzymana (0 zł)

### Harmonogram:
- **Dzień 1-3:** Czy są wyświetlenia?
- **Dzień 4-7:** CTR i kliknięcia
- **Po 7 dniach:** Analiza konwersji
- **Po 14 dniach:** Decyzja: kontynuować/optymalizować/wyłączyć

## Kontrola kosztów

| Parametr | Wartość |
|----------|---------|
| Budżet dzienny | 50 PLN (25+25) |
| Miesięcznie | ~1500 PLN |

**Opcje:**
- Mniej niż 1000 PLN/mies → zmniejsz do 16 zł/dzień/kampanię
- Jedna nie działa → wstrzymaj i przenieś budżet

**Bezpieczeństwo:**
- ✅ Brak umów
- ✅ Można pauzować w każdej chwili
- ✅ Płatność tylko za kliknięcia

---

# PROMOCJA ORGANIC

## Telegram (aktywna kampania)

| Parametr | Wartość |
|----------|---------|
| **Kanał** | t.me/yavpolshi (23k) |
| **Admin** | @werbax123 (Sergii Murenets) |
| **Koszt** | 120 PLN |
| **Publikacja** | 5.01.2026, 17:00 |
| **Status** | OPŁACONE |

## Facebook

### Strona Henio
- URL: https://www.facebook.com/profile.php?id=61585710257199
- 3 posty opublikowane (4.01.2026)

### Grupy UA (dołączone 4.01.2026)
- 22 grup dołączonych (~1.5M członków)
- 6 postów opublikowanych
- Czekamy na zatwierdzenia adminów

### Grupy PL-EN (do dołączenia)
- NAUKA JĘZYKA ANGIELSKIEGO ZA DARMO (40k)
- Nauka angielskiego - Grupa wsparcia (18k)
- Szybka nauka języka angielskiego (17k)
- Samodzielna nauka angielskiego (11k)
- Grupy Polaków w UK (~313k łącznie)

## Reddit (do zrobienia)

**Subreddity:**
- r/learnpolish (46k) - UA→PL
- r/Polska (750k) - PL→EN
- r/languagelearning (1.8M) - uniwersalny

**Strategia:**
1. 5-10 pomocnych komentarzy (bez reklamy)
2. Post o apce z 7-dniowym trialem
3. Nie spamować, być pomocnym

---

# GOTOWE POSTY

## UA→PL (r/learnpolish)
```
Title: Photo → Polish flashcards in 30 seconds (AI app I built)

**The problem:** Converting class notes to flashcards takes forever.

**My solution:** Take a photo of ANY text → AI extracts words → Creates flashcards with pronunciation guide.

What makes it different:
- 🎤 Pronunciation training with AI feedback (szcz, ść, ą, ę)
- 📸 Works with handwritten notes
- 🎯 Spaced repetition + quizzes

Built for Ukrainian speakers learning Polish.

**Try it free for 7 days** (no card): henio.app
```

## PL→EN (r/Polska)
```
Title: Zrobiłem apkę która zamienia zdjęcie notatek w fiszki angielskie w 30 sekund

Problem: Przepisywanie słówek do Anki zajmuje więcej czasu niż sama nauka.

Rozwiązanie: Robisz zdjęcie → AI wyciąga słówka → Masz gotowe fiszki z wymową.

- 🎤 Trening wymowy z AI (mówisz → dostajesz ocenę)
- 📸 Rozpoznaje odręczne notatki
- 🎯 Quizy + powtórki

**7 dni za darmo** (bez karty): henio.app
```

## Facebook UA
```
📸 Фото з зошита → слова і тест за 5 хв!

Henio допоможе швидко вивчати польську:
✅ Фото → фішки автоматично
✅ Тренуй вимову з AI
✅ Квізи на повторення

🎯 7 днів безкоштовно: henio.app
```

## Facebook PL
```
📸 Zdjęcie notatek → słówka angielskie w 5 minut!

Henio to aplikacja do nauki angielskiego:
✅ Robisz zdjęcie tekstu/notatek
✅ AI tworzy fiszki automatycznie
✅ Uczysz się z quizami i treningiem wymowy

🎯 7 dni za darmo - bez karty: henio.app
```

---

# GRUPY DOCELOWE

## UA→PL (Ukraińcy w Polsce)
- Uczniowie 16+ w polskich szkołach
- Potrzeby: słówka do szkoły, wymowa, codzienne sytuacje
- Język: ukraiński + polski

## PL→EN (Polacy)
- Maturzyści (17-19) - przygotowanie do matury
- Studenci (19-25) - certyfikaty FCE/CAE
- Pracujący (25-45) - angielski do pracy
- Emigranci do UK - szybka nauka

---

# POZYCJONOWANIE

## 3 filary:
1. **Szybkość:** "Zdjęcie → fiszki w 5 min"
2. **Wymowa:** "AI ocenia i pokazuje jak mówić"
3. **Wygoda:** "Uczysz się gdzie chcesz"

## USP:
- Zdjęcie notatek → fiszki automatycznie
- Trening wymowy z AI feedback
- 7 dni za darmo, bez karty
- Polska aplikacja

---

# DO ZROBIENIA

## Tydzień 1:
- [ ] Sprawdzić czy Google zweryfikował tag (24-48h)
- [ ] Monitorować wyświetlenia i kliknięcia
- [ ] Odpowiadać na komentarze w grupach FB

## Tydzień 2:
- [ ] Analiza pierwszych konwersji
- [ ] Dołączyć do grup angielskich na FB
- [ ] Pierwszy post na Reddit

## Później:
- [ ] Product Hunt (gdy 50+ użytkowników)
- [ ] Współprace z korepetytorami
- [ ] Video demo (15-30s)

---

**Ostatnia aktualizacja:** 6 stycznia 2026

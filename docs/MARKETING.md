# Plan Promocji Henio

## Status
- Data: 6 stycznia 2026
- Budżet miesięczny Google Ads: ~1500 PLN (50 zł/dzień)
- Landing: https://henio.app
- Ceny: 19.99 PLN/mies, 149.99 PLN/rok, trial 7 dni

---

## ⚠️ ZASADA #1: NIE KŁAMIEMY O CENIE!

**Henio NIE JEST darmową aplikacją!**

| ✅ PRAWIDŁOWO | ❌ BŁĘDNIE (kłamstwo) |
|---------------|----------------------|
| "7-day free trial" | "free app" |
| "7 dni za darmo" | "darmowa aplikacja" |
| "trial bez karty" | "za darmo" (bez kontekstu) |
| "wypróbuj za darmo przez 7 dni" | "darmowa nauka" |

**Konsekwencje kłamania:**
- Naruszenie prawa konsumenckiego (fałszywa reklama)
- Utrata zaufania użytkowników
- Potencjalne kary/bany na platformach

**Zawsze precyzuj:** "7-dniowy darmowy trial, potem 19.99 PLN/mies"

---

# GOOGLE ADS - KAMPANIA MVP

## Konto Google Ads
- **Account ID:** AW-17853999994
- **Email:** radekbroniszewski@gmail.com
- **Conversion ID:** TAKeCJW8nN0bEPrWucFC (akcja: Rejestracja)

## Tracking (wdrożony)
- Zmienne środowiskowe dodane do Azure (UAT + PRD):
  - `NEXT_PUBLIC_GOOGLE_ADS_ID=AW-17853999994`
  - `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID=TAKeCJW8nN0bEPrWucFC`
- Kod gtag.js w `src/app/layout.tsx`
- Tracking konwersji w `src/app/register/page.tsx`

## Kampania 1: UA-PL Nauka polskiego (AKTYWNA ✅)

### Ustawienia
| Parametr | Wartość |
|----------|---------|
| **Nazwa** | UA-PL Nauka polskiego |
| **Typ** | Sieć wyszukiwania (Search) |
| **Cel** | Potencjalni klienci → Rejestracje |
| **Stawki** | Maksymalizuj konwersje |
| **Lokalizacja** | Polska |
| **Języki** | polski + ukraiński |
| **Budżet dzienny** | 25 PLN |
| **Status** | **AKTYWNA** (opublikowana 6.01.2026) |

### Słowa kluczowe (10)
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

### Reklama (Responsive Search Ad)
**Nagłówki:**
1. Вивчай польську з AI
2. Фото → Фішки за 5 хв
3. 7 днів безкоштовно
4. Nauka polskiego z AI
5. Aplikacja Henio
6. Польська без стресу

**Opisy:**
1. Сфотографуй зошит, отримай картки. Тренуй вимову з AI. Квізи.
2. Zrób zdjęcie tekstu, AI stworzy fiszki. Trening wymowy. Quizy.

**URL:** henio.app

### Prognozy (Google Ads)
| Metryka | Wartość |
|---------|---------|
| Koszt tygodniowy | ~175 PLN |
| Koszt miesięczny | ~750 PLN |
| Konwersje/tydzień | ~33 |
| Koszt/konwersja | ~5,30 PLN |

### Status
- [x] Konto Google Ads utworzone
- [x] Konwersja "Rejestracja" skonfigurowana
- [x] Tracking dodany do aplikacji
- [x] Zmienne wdrożone na Azure (UAT/PRD)
- [x] **Kampania OPUBLIKOWANA i AKTYWNA** (6.01.2026)

## Kampania 2: PL-EN Angielski (AKTYWNA ✅)

### Ustawienia
| Parametr | Wartość |
|----------|---------|
| **Nazwa** | PL-EN Nauka angielskiego |
| **Typ** | Sieć wyszukiwania (Search) |
| **Cel** | Potencjalni klienci → Rejestracje |
| **Stawki** | Maksymalizuj konwersje |
| **Lokalizacja** | Polska |
| **Języki** | polski + angielski |
| **Budżet dzienny** | 25 PLN |
| **Status** | **AKTYWNA** (opublikowana 6.01.2026) |

### Słowa kluczowe (7)
- nauka angielskiego online
- aplikacja do nauki angielskiego
- angielski za darmo
- nauka słówek angielskich
- fiszki angielskie
- matura angielski 2025
- angielski do pracy

### Reklama (Responsive Search Ad)
**Nagłówki:**
1. Angielski z AI - 5 min/dzień
2. Fiszki ze zdjęcia notatek
3. 7 dni za darmo
4. Matura 2025 - Angielski
5. Ucz się słówek z AI
6. Nauka angielskiego z AI

**Opisy:**
1. Zrób zdjęcie tekstu, AI stworzy fiszki. Trening wymowy z oceną.
2. Idealne na maturę i do pracy. Wypróbuj Henio za darmo!

**URL:** henio.app

### Prognozy (Google Ads)
| Metryka | Wartość |
|---------|---------|
| Koszt tygodniowy | ~175 PLN |
| Koszt miesięczny | ~750 PLN |
| Konwersje/tydzień | ~23 |
| Koszt/konwersja | ~7,60 PLN |

### Status
- [x] **Kampania OPUBLIKOWANA i AKTYWNA** (6.01.2026)

## Kontrola kosztów

| Parametr | Wartość |
|----------|---------|
| **Budżet dzienny (obie)** | 50 PLN |
| **Kampania UA-PL** | ~750 PLN/mies |
| **Kampania PL-EN** | ~750 PLN/mies |
| **Razem** | **~1500 PLN/mies** |

### Jak zarządzać kosztami:
1. **Budżet dzienny** - ustawiony 25 zł/kampania, można zmienić w dowolnym momencie
2. **Pauzowanie** - można wstrzymać kampanię jednym kliknięciem (wtedy 0 zł)
3. **Płatność za kliknięcia** - jeśli nikt nie kliknie, nie płacisz

### Bezpieczeństwo:
- ✅ Brak umów długoterminowych
- ✅ Można pauzować w każdej chwili
- ✅ Płatność tylko za kliknięcia
- ✅ Budżet dzienny = twardy limit

### Opcje oszczędności:
- Chcesz < 1000 PLN/mies? → Zmniejsz budżet do 16 zł/dzień/kampanię
- Jedna kampania nie działa? → Wstrzymaj ją i przenieś budżet na drugą

---

# DARMOWA PROMOCJA - PLAN WYKONAWCZY

## Priorytet kanałów (od najskuteczniejszych)

### 1. Reddit (WYSOKI priorytet)
**Dlaczego:** 40% użytkowników odkrywa apki przez rekomendacje, Reddit ma +1348% wzrost widoczności w Google.

**⚠️ WAŻNE - PRAWIDŁOWY PRZEKAZ:**
- Henio NIE JEST darmowy - ma tylko **7-dniowy darmowy trial**
- ZAWSZE pisać: "7-day free trial" lub "7 dni za darmo"
- NIGDY nie pisać: "free app", "darmowa aplikacja" - to kłamstwo i naruszenie prawa konsumenckiego!

**Subreddity UA→PL:**
- r/learnpolish (46k członków) - główny sub do nauki polskiego
- r/poland (580k) - ogólny, można wrzucić w relevant thread
- r/languagelearning (1.8M) - ogólny o nauce języków

**Subreddity PL→EN:**
- r/Polska (750k) - polskojęzyczny, można po polsku
- r/matura - przygotowanie do matury

**Strategia:**
1. Najpierw: 5-10 pomocnych komentarzy (bez reklamy)
2. Potem: post o apce z 7-dniowym trialem
3. Kluczowe: być pomocnym, nie spamować, NIE kłamać o cenie!

**Gotowy post UA→PL (r/learnpolish):**
```
Title: Photo → Polish flashcards in 30 seconds (AI app I built)

I was frustrated with manually creating flashcards, so I built something different.

**The problem:** You're in Polish class, taking notes, but converting them to flashcards takes forever.

**My solution:** Take a photo of ANY text (notebook, textbook, menu, sign) → AI extracts words → Creates flashcards with pronunciation guide.

What makes it different:
- 🎤 Pronunciation training with AI feedback (szcz, ść, ą, ę - the hard sounds!)
- 📸 Works with handwritten notes, not just typed text
- 🎯 Spaced repetition + quizzes built in

Built specifically for Ukrainian speakers learning Polish (but works for anyone).

**Try it free for 7 days** (no card needed): henio.app

Would love honest feedback - what features would make this more useful for you?
```

**Gotowy post PL→EN (r/Polska):**
```
Title: Zrobiłem apkę która zamienia zdjęcie notatek w fiszki angielskie w 30 sekund

Problem: Przepisywanie słówek do Anki zajmuje więcej czasu niż sama nauka.

Rozwiązanie: Robisz zdjęcie → AI wyciąga słówka → Masz gotowe fiszki z wymową.

Co działa:
- 🎤 Trening wymowy z AI (mówisz → dostajesz ocenę + podpowiedzi)
- 📸 Rozpoznaje nawet odręczne notatki
- 🎯 Quizy + powtórki rozłożone w czasie

**7 dni za darmo** żeby przetestować (bez karty): henio.app

Szukam betatersterów - co by wam się przydało? Jakich funkcji brakuje?
```

**Gotowy post r/languagelearning (EN, uniwersalny):**
```
Title: I built an app that turns photos of notes into flashcards with AI - looking for feedback

**The workflow:**
1. Snap a photo of your notes/textbook/anything
2. AI extracts vocabulary automatically
3. Creates flashcard pairs with example sentences
4. Practice with quizzes + pronunciation training

**Why I built it:**
I was spending more time creating flashcards than actually learning. Tried OCR + ChatGPT workflows but they were clunky. So I made this.

**What's different:**
- Works with handwritten notes (not just printed text)
- Pronunciation training with real-time AI feedback
- Specifically optimized for Slavic languages (Polish, Ukrainian) but works with English too

**7 days free** to try everything: henio.app

Genuinely looking for feedback from language learners. What would make this more useful?
```

### 2. Discord (ŚREDNI priorytet)
**Serwery do dołączenia:**
- StudyNest - społeczność uczniów
- Matura 2025/2026 - maturzyści
- TeachMe - pomoc w nauce
- #ustne2025 - wymiana pytań maturalnych

**Strategia:**
1. Dołączyć do serwerów
2. Być pomocnym przez tydzień
3. Wspomnieć o apce gdy pasuje do rozmowy

### 3. Facebook Grupy (WYSOKI - już zaczęte)
**Status:** Odblokowane - kontynuować!

**Gotowe grupy UA (z MARKETING.md):**
- 6 postów już opublikowanych
- Czekamy na zatwierdzenia adminów
- Odpowiadać na komentarze

**Nowe grupy PL→EN do dołączenia:**
- NAUKA JĘZYKA ANGIELSKIEGO ZA DARMO (40k)
- Nauka angielskiego - Grupa wsparcia (18k)
- Szybka nauka języka angielskiego (17k)
- Samodzielna nauka angielskiego (11k)

### 4. Quora (NISKI priorytet, ale długoterminowo)
**Pytania do odpowiedzi:**
- "Jak szybko nauczyć się polskiego?"
- "Jakie są najlepsze aplikacje do nauki angielskiego?"
- "Jak przygotować się do matury z angielskiego?"

### 5. Product Hunt (ŚREDNI - jednorazowy boost)
**Kiedy:** Gdy będzie 50+ użytkowników i pozytywne opinie
**Przygotowanie:**
- Ładne screenshoty
- Video demo (15-30s)
- Tagline: "Learn Polish/English from photos with AI"

### 6. TikTok (OPCJONALNIE - wymaga contentu)
**Format który działa:**
- 5-7 sekund: szybki tip
- 27-35 sekund: tutorial funkcji
- Hook w pierwszych 3 sekundach

**Pomysły na content:**
- "POV: robisz zdjęcie notatek i masz fiszki w 5 sekund"
- "Trening wymowy TH - AI ocenia jak mówisz"

---

## Status Google Ads
**KAMPANIE AKTYWNE** (od 6.01.2026)

✅ UA-PL Nauka polskiego - 25 PLN/dzień
✅ PL-EN Nauka angielskiego - 25 PLN/dzień
✅ Tracking konwersji działa
✅ Tag wdrożony na produkcji

## Jak monitorować kampanie (dla początkujących)

### Gdzie sprawdzać wyniki:
1. Wejdź na https://ads.google.com
2. Zaloguj się kontem radekbroniszewski@gmail.com
3. Kliknij "Kampanie" w menu po lewej

### Co sprawdzać (raz dziennie przez pierwszy tydzień):

| Metryka | Gdzie | Co oznacza | Dobry wynik |
|---------|-------|------------|-------------|
| **Wyświetlenia** | Kolumna "Wyśw." | Ile razy reklama się pokazała | > 100/dzień |
| **Kliknięcia** | Kolumna "Klikn." | Ile osób kliknęło | > 10/dzień |
| **CTR** | Kolumna "CTR" | % kliknięć vs wyświetlenia | > 3% |
| **Koszt** | Kolumna "Koszt" | Ile wydałeś | ≤ 25 zł/kampania |
| **Konwersje** | Kolumna "Konw." | Ile rejestracji | > 1/dzień |

### Czerwone flagi (reaguj!):
- ❌ CTR < 1% przez 3 dni → słabe teksty reklam, zmień nagłówki
- ❌ 0 konwersji przez 5 dni → sprawdź czy tracking działa
- ❌ Koszt/konwersja > 20 zł → słowa kluczowe zbyt ogólne

### Kiedy pauzować kampanię:
- Koszt/konwersja > 30 zł
- CTR < 0.5% przez tydzień
- Brak konwersji przez 7 dni

### Jak wstrzymać kampanię:
1. Wejdź w kampanię
2. Kliknij niebieski przełącznik przy nazwie → zmieni się na szary
3. Kampania wstrzymana (0 zł kosztów)

### Harmonogram sprawdzania:
- **Dzień 1-3:** Sprawdź czy reklamy się wyświetlają (czy są "wyświetlenia")
- **Dzień 4-7:** Sprawdź CTR i kliknięcia
- **Po 7 dniach:** Pierwsza analiza konwersji
- **Po 14 dniach:** Decyzja: kontynuować, optymalizować, czy wyłączyć

---

## AKTYWNA KAMPANIA
- Kanal: t.me/yavpolshi (23k subskrybentow)
- Admin: Sergii Murenets (@werbax123)
- Koszt: 120 PLN
- Publikacja: 5 stycznia 2026, godz. 17:00
- Platnosc: Revolut 78291000060000000003113160 (Sergii Murenets)
- Wyslane materialy: kolaz 4 grafik + tekst UA
- Status: OPLACONE, czekamy na publikacje

## TL;DR
- Cel: zwiekszyc zapisy na waitliste i aktywacje pierwszego dnia.
- Priorytet: uczniowie UA w Polsce (szkola, szybkie slownictwo, wymowa).
- Glowne kanaly: Telegram + Facebook grupy UA, pozniej Instagram.
- Start: organic + outreach, dopiero potem platne testy.

## Cele i KPI
### Cele biznesowe
- Zwiekszyc liczbe zapisow na waitliste.
- Zapewnic aktywacje (slownictwo + pierwsza sesja w 24h).
- Utrzymac podstawowa retencje (D1 i D7).

### KPI (definicje)
- Zapisy: liczba nowych zapisow na waitliste / tydzien.
- Aktywacja 24h: dodanie slowek + pierwsza sesja (fiszki/quiz/wymowa).
- D1/D7: powrot nastepnego dnia / po 7 dniach.
- Trial -> PRO: konwersja po okresie probnym (orientacyjnie).

## Pozycjonowanie i przekaz
### 3 filary
1) Szkola w PL bez stresu: material z lekcji -> gotowe slowka.
2) Szybkosc: "Zdjecie kartki -> fiszki i quiz w 5 min".
3) Wymowa: podpowiedzi ulozenia ust + trening glosu.

### Obietnica (1 zdanie)
Zrob slownictwo z lekcji w 5 minut i ucz sie polskiego codziennie bez chaosu.

## Grupa docelowa
- Glowna: uczniowie UA w Polsce (16+).
- Potrzeby: szybkie slownictwo do szkoly, codzienne sytuacje, wymowa.
- Jezyk: ukrainski + polski (prosto, bez slangu).

## Budzet (5000 PLN)
- 1800 PLN: Meta Ads (testy + skalowanie).
- 1200 PLN: mikro-partnerzy i korepetytorzy.
- 1000 PLN: produkcja tresci (wideo, grafiki).
- 500 PLN: zachenty / kody dla adminow / liderow grup.
- 500 PLN: zapas / nieprzewidziane.

## Zrealizowane zadania
### Facebook Page
- URL: https://www.facebook.com/profile.php?id=61585710257199
- Nazwa: Henio
- Kategoria: Strona poswiecona edukacji
- Logo: Maltanczyk (poprawne)
- Link: henio.app
- Cover photo: Kolaz 4 grafik marketingowych (dodane 4.01.2026)
- Biogram: "🐶 Вивчай польську з Henio! Фото→слова, AI-вимова, квізи. 7 днів безкоштовно! Ucz się polskiego łatwo! henio.app"
- Pierwszy post: Opublikowany 4.01.2026 (kolaz + tekst UA)
- Post #2: Opublikowany 4.01.2026 (wymowa + grafika UA)
- Post #3: Opublikowany 4.01.2026 (szkola + grafika UA)
- Status: Aktywna, 3 posty opublikowane

### Telegram
- Konto: Henio App
- Logo: Dodane (maltanczyk)
- Dolaczone kanaly UA:
  1) Я в Польщі (Yavp.pl) - 23,589 subskrybentow
     - Admin: @werbax123 (Sergii Murenets)
     - Status: Wiadomosc wyslana z propozycja wspolpracy
  2) UAinKrakow.pl: життя в місті - 13,906 subskrybentow
     - Kontakt: @UAinKrakow_pl
  3) Наша Польща - 3,566 subskrybentow
     - Kontakt: @Napol_thebot

### Facebook Grupy UA (dolaczone 4.01.2026)
Laczny zasieg: ~1.5M czlonkow

**OPUBLIKOWANE POSTY (4.01.2026):**
1. Ukrainci v Polsce (40.7k) - post o szkole + grafika AI
   - Tresc: Szkola w PL, zdjecie -> fiszki w 5 min
   - Status: Oczekuje na zatwierdzenie admina
2. Ukrainci u Varsavi (28.1k) - post o wymowie + grafika wymowa
   - Tresc: Trening wymowy z AI, szcz/sc/rz
   - Status: Oczekuje na zatwierdzenie admina
3. 💙💛 Українці в Польщі (27.3k) - post o pracy + nauce
   - Tresc: Praca + nauka polskiego, fiszki z AI, misja dnia
   - Grafika: Gotowi_kartki_ta_kvizi.png
   - Status: OPUBLIKOWANY (widoczny natychmiast)
4. Українці в Щецині (69.6k) - post o zeszycie -> slowa
   - Tresc: Zeszyt -> foto -> fiszki w 5 min, wymowa AI
   - Grafika: Zoshyt_Slova_5_khvylyn.png
   - Status: Oczekuje na zatwierdzenie admina
5. Ukraińcy w Bydgoszczy (40.4k) - post o wymowie
   - Tresc: Trening wymowy szcz/sc/rz/z z AI
   - Grafika: Trenuj_idealnu_vymovu.png
   - Status: Oczekuje na zatwierdzenie admina
6. UKRAINCY W POLSCE - UKRAINCI V POLSCI (216k) - post o misji dnia
   - Tresc: Misja dnia 10 slow, fiszki, AI wymowa
   - Grafika: Gotovi_kartky_ta_kvizy.png
   - Status: Oczekuje na zatwierdzenie admina

**Duze grupy ogolne (dolaczone):**
- UKRAINCY W POLSCE - UKRAINCI V POLSCI (216k) - POST OPUBLIKOWANY
- Ukrainci u Polsci | Ukraincy w Polsce (121k) - dolaczone
- Robota/poslugi v KATOVICE (121k) - dolaczone
- Robota v Polsci (97k) - dolaczone
- Rabota v Polsce (89k) - dolaczone
- RABOTA V POLSZE (85k) - dolaczone
- Ukrainci v Katovicah (70k) - pending approval
- Ukrainci v Scecini (69k) - POST OPUBLIKOWANY
- Ukrainci v Katovice PRACJA (48k) - dolaczone
- UKRAINCY W POLSCE UKRAINCI V POLSCI (43k) - dolaczone
- Ukraincy w Bydgoszczy (40k) - POST OPUBLIKOWANY
- Ukrainci v Polsce (40k) - POST OPUBLIKOWANY
- UKRAINCI V OPOLE (33k) - dolaczone
- Ukrainci u Varsavi (28k) - POST OPUBLIKOWANY
- Ukrainci v Polsci (27k) - dolaczone
- Nasi v Kalivu (25k) - pending approval
- OGLOSZENIA | OGLOSZENIA (23k) - dolaczone
- Ukrainci v Lodzi (23k) - dolaczone
- UKRAINCI V POLSCI - UKRAINCY W POLSCE (18k) - dolaczone
- Ukrainci v Polsci / Ukraincy w Polsce (11k) - dolaczone
- Ukrainci v Krakovi (11k) - dolaczone
- Ukraincy w Polsce - Ukrainci v Polsci (8.6k) - dolaczone
- Mami z Ukraini v Polsci (8.1k) - dolaczone (ograniczenia postowania)
- Ukraincy w calej Polsce (9k) - dolaczone
- Ukrainci v Polsci m.Sosnowiec (7.9k) - pending approval

**Status:** 22 grup dolaczonych, 3 pending approval, 6 postow opublikowanych (CEL 5-8 OSIAGNIETY!)
**Nastepne kroki:** Monitorowac zatwierdzenia adminow, odpowiadac na komentarze

### Logo
- Lokalizacja: .playwright-mcp/Minimalist-modern-logo-for-vocabulary-learning-app-called-Henio-cute-white-Maltese-puppy-dog-mascot-character-with-floppy-ears-purple-8b5cf6-circular-background-orange-gold-f59e0b-collar-accessory-kawaii-cartoon-style-clean-vector-illust.jpg
- Opis: Bialy maltanczyk, fioletowe tlo (#8b5cf6), pomaranczowa obroza (#f59e0b)
- Uzyte na: Facebook Page

## Fazy kampanii (dokladne kroki)
### Faza 1 - Setup (DONE)
- [x] Strona FB + logo
- [x] Konto Telegram + logo
- [x] Lista 3 kanalow UA
- [ ] UTM template (np. utm_source=telegram&utm_medium=post&utm_campaign=ua_pl)
- [ ] Arkusz trackingu (zapisy, aktywacje, komentarze)

### Faza 2 - Tresci (W TRAKCIE)
- [x] Zdjecie w tle FB (kolaz 4 grafik UA) - dodane 4.01.2026
- [x] Biogram strony FB (UA/PL) - dodany 4.01.2026
- [x] Pierwszy post FB (kolaz + tekst UA) - opublikowany 4.01.2026
- [x] Post #2 FB (wymowa + grafika) - opublikowany 4.01.2026
- [x] Post #3 FB (szkola + grafika) - opublikowany 4.01.2026
- [ ] 3 krotkie video (15-30 s): zdjecie -> slowka, wklejka -> quiz, wymowa -> wynik
- [ ] 1 dlugie demo (60-90 s): onboarding -> pierwsza sesja
- [ ] Pozostale 5 postow (UA/PL)

### Faza 3 - Outreach (UKONCZONA)
- [x] Wiadomosc do @werbax123 - wyslana 4.01.2026
- [x] Wiadomosc do @UAinKrakow_pl - wyslana 4.01.2026
- [x] Wiadomosc do @Napol_thebot - wyslana 4.01.2026
- [x] Odpowiedz od Sergii (@werbax123) - cennik otrzymany
- [x] Zamowiono post na t.me/yavpolshi za 120 PLN
- [x] Wyslano kolaz + tekst UA do Sergii
- [x] Oplacono 120 PLN na Revolut - 4.01.2026
- [ ] Publikacja: 5.01.2026 godz. 17:00

### Faza 4 - Beta i feedback
- [ ] Rekrutacja 30 testerow z 3 kanalow
- [ ] Onboarding 1:1 (instrukcja startu)
- [ ] Ankieta po 3 dniach + 1 pytanie otwarte
- [ ] 5 krotkich opinii do social proof

### Faza 5 - Paid Ads (DRAFT, bez publikacji)
- [ ] Draft kampanii Meta Ads (cel: ruch)
- [ ] 2 zestawy reklam: zainteresowania vs szerokie
- [ ] 2 kreacje na zestaw (wideo + statyczna)
- [ ] Budzet start: 40 PLN/dzien
- [ ] Uruchomienie dopiero po akceptacji

### Faza 6 - Optymalizacja
- [ ] Cotygodniowy raport (zapisy, aktywacje, D1/D7)
- [ ] Zatrzymanie slabych kreacji (CTR < 1% lub koszt zapisu wysoki)
- [ ] Skalowanie zwycieskich kreacji

## Pakiet tresci (do przygotowania)
- Video 15-30 s (x3)
- Video 60-90 s (x1)
- Grafiki statyczne (x3)
- Screenshoty aplikacji (x6-8)
- Mini FAQ (x6 pytan i odpowiedzi)

## Gotowe posty (UA + PL)
1) UA: "Фото з зошита -> слова і тест за 5 хв. Henio допоможе швидко вивчати польську. 7 днів безкоштовно. henio.app/waitlist"
   PL: "Zdjecie z zeszytu -> slowa i test w 5 min. Henio pomaga szybko ogarnac polski. 7 dni za darmo. henio.app/waitlist"
2) UA: "Тренування вимови з підказками. Слухаєш -> повторюєш -> отримуєш wynik. Спробуй Henio."
   PL: "Trening wymowy z podpowiedziami. Sluchasz -> powtarzasz -> masz wynik. Sprawdz Henio."
3) UA: "Підготовка до школи в Польщі без стресу. Слова з lekcji zamieniasz w fiszki."
   PL: "Szkola w Polsce bez stresu. Slowa z lekcji zamieniasz w fiszki."
4) UA: "Місія дня: 10 слів + нагорода. Henio motywuje codziennie."
   PL: "Misja dnia: 10 slow + nagroda. Henio motywuje codziennie."
5) UA: "Зроби словник з тексту або PDF. 2 kliky i masz fiszki."
   PL: "Zrob slownik z tekstu lub PDF. 2 klikniecia i masz fiszki."
6) UA: "Короткий квіз після lekcji. 5 хвилин i wiesz, co pamiętasz."
   PL: "Krotki quiz po lekcji. 5 minut i wiesz, co pamietasz."
7) UA: "7 днів безкоштовно. Якщо не підходить — закрий, без ризику."
   PL: "7 dni za darmo. Jak nie pasuje, zamykasz bez ryzyka."
8) UA: "Польська щодня, без chaosu. Henio prowadzi ci krok po kroku."
   PL: "Polski codziennie, bez chaosu. Henio prowadzi krok po kroku."

## Odpowiedzi na komentarze / DM (UA + PL)
1) UA: "Так, можна почати безкоштовно (7 днів). Потім decyzja."
   PL: "Tak, start jest darmowy (7 dni). Potem decyzja."
2) UA: "Henio працює на телефоні та w przegladarce."
   PL: "Henio dziala na telefonie i w przegladarce."
3) UA: "Можеш додати слова з фото/tekstu/PDF і od razu зробити квіз."
   PL: "Mozesz dodac slowa ze zdjecia/tekstu/PDF i od razu zrobic quiz."
4) UA: "Посилання на запис: henio.app/waitlist"
   PL: "Link do zapisu: henio.app/waitlist"

## Wiadomosci do adminow (2 warianty)
### Wariant 1
Добрий день! Я Радек, tworca aplikacji Henio (henio.app).
Robie narzedzie do nauki polskiego dla Ukraincow w Polsce.
Czy u Was mozna opublikowac post edukacyjny? Moge przygotowac
konkretny material dla Waszej spolecznosci.

### Wariant 2
Привіт! Є безкоштовний 7-денний доступ до Henio для українців у Польщі.
Чи можна у Вас зробити короткий пост? Якщо треба, dam kod lub demo.

## Draft reklam (bez publikacji)
- Cel: Traffic (lub Lead, jesli po testach da lepszy koszt zapisu)
- Lokalizacja: Polska
- Jezyk: UA/PL
- Wiek: 18+ (bez targetowania nieletnich)
- Zestaw A: zainteresowania (nauka polskiego, szkola, jezyki)
- Zestaw B: szerokie (bez zainteresowan)
- Budzet start: 40 PLN/dzien, 5 dni testu
- Kreacje: 1 wideo + 1 statyczna na zestaw
- Link: https://henio.app/waitlist?utm_source=meta&utm_medium=ad&utm_campaign=ua_pl_launch

## Tracking i raportowanie
- UTM dla kazdego kanalu (telegram, fb, partnerzy, ads).
- Arkusz tygodniowy: zapisy, aktywacje 24h, D1/D7, komentarze.
- Raport 1x/tydz: co dziala, co wycinamy, co skalujemy.

## Najblizsze kroki (7 dni)
1) Dodac UTM template + arkusz trackingu.
2) Zrobic 3 krotkie video + 3 grafiki.
3) Opublikowac 2 pierwsze posty po uzyskaniu zgody adminow.
4) Zrekrutowac 10 testerow i zebrac pierwszy feedback.

## Notatka jezykowa
- Uzywac "7 dniv bezkoshtovno" (7 dni za darmo).
- Unikac bledow typu "безкоштовний" w polskich wstawkach.

## Metryki do sledzenia
- Wejscia na waitliste
- Zapisy / dzien i tydzien
- Aktywacje w 24h
- D1 i D7
- Odpowiedzi od adminow

## Ostatnia aktualizacja
6 stycznia 2026

---

# SEGMENT 2: Polacy uczący się angielskiego (PL→EN)

## Status PL→EN
- Faza: Research + Setup
- Data startu: 5 stycznia 2026
- Priorytet: WYSOKI (duży rynek, mniejsza konkurencja w grupach FB)

## Grupa docelowa PL→EN

### Główne persony:
1. **Maturzyści** (17-19 lat) - przygotowanie do matury z angielskiego
2. **Studenci** (19-25 lat) - angielski akademicki, certyfikaty (FCE, CAE)
3. **Pracujący dorośli** (25-45 lat) - angielski do pracy, biznesowy
4. **Emigranci do UK/Irlandii** - szybka nauka przed/po wyjeździe

### Potrzeby:
- Szybkie słówka do pracy/szkoły
- Trening wymowy (th, r, w vs v)
- Przygotowanie do egzaminów
- Konwersacje codzienne

## Pozycjonowanie PL→EN

### 3 filary:
1) **Szybkość:** "Zdjęcie notatek → fiszki i quiz w 5 min"
2) **Wymowa:** "Trening th, r, w/v z AI - słuchasz, powtarzasz, masz wynik"
3) **Elastyczność:** "Uczysz się gdzie chcesz - telefon, tablet, przeglądarka"

### Obietnica (1 zdanie):
"Zrób słówka z pracy/szkoły w 5 minut i mów po angielsku pewniej każdego dnia."

## Research grup FB (5 stycznia 2026)

### Grupy NAUKA ANGIELSKIEGO (priorytet 1):
| Grupa | Członkowie | Typ |
|-------|------------|-----|
| NAUKA JĘZYKA ANGIELSKIEGO ZA DARMO | 40k | Publiczna |
| Nauka angielskiego - Grupa wsparcia | 18k | Publiczna |
| Szybka nauka języka angielskiego | 17k | Publiczna |
| Samodzielna nauka angielskiego | 11k | Publiczna |
| Nauka angielskiego w Wielkiej Brytanii | 10k | Publiczna |
| materiały do nauki j. angielskiego | 6.2k | Publiczna |
| Nauka Języka ANGIELSKIEGO z GREGIEM! | 5k | Publiczna |
| Szybka nauka angielskiego dla Polaków w UK | 3.7k | Publiczna |
| **ŁĄCZNIE** | **~111k** | |

### Grupy MATURALNE (priorytet 2 - sezonowe):
| Grupa | Członkowie |
|-------|------------|
| Matura 2024 - język angielski | 2.8k |
| Matura z angielskiego 2023 | 2.5k |
| Matura 2025 - polski wos angielski | 1.8k |
| Matura z języka angielskiego | 1.1k |
| Matura z języka angielskiego 2026 | 730 |
| Matura 2026 - język angielski | 780 |
| **ŁĄCZNIE** | **~10k** |

### Grupy POLACY W UK (priorytet 3 - emigranci):
| Grupa | Członkowie |
|-------|------------|
| Polacy w Uk / Polonia w UK | 89k |
| Polacy w Londynie - LONDYŃCZYCY | 83k |
| Polacy w Coventry | 30k |
| Polacy w Birmingham | 25k |
| Polacy w Manchester | 18k |
| Polacy w UK - Londyn, Anglia... | 14k |
| Polacy w Londynie / Ogłoszenia | 11k |
| Polacy w Sheffield | 7.8k |
| Polacy Na Wyspach | 7.5k |
| Polacy w Bristol | 7k |
| Polacy Doncaster | 6.3k |
| Polacy w Southampton | 5.4k |
| Polacy w Barnsley | 4.8k |
| Polacy w Nottingham | 4.5k |
| **ŁĄCZNIE** | **~313k** |

### ŁĄCZNY POTENCJALNY ZASIĘG PL→EN: ~434k

## Gotowe posty PL→EN

### Post 1: Główny (zdjęcie → fiszki)
```
📸 Zdjęcie notatek → słówka angielskie w 5 minut!

Henio to aplikacja do nauki angielskiego:
✅ Robisz zdjęcie tekstu/notatek
✅ AI tworzy fiszki automatycznie
✅ Uczysz się z quizami i treningiem wymowy

🎯 7 dni za darmo - bez karty!
Sprawdź 👉 henio.app
```

### Post 2: Wymowa
```
🗣️ Masz problem z wymową angielską?

Henio pomoże Ci z:
• TH (think, this) - najtrudniejszy dźwięk
• R vs L (right, light)
• W vs V (wine, vine)

AI pokazuje jak ułożyć usta + ocenia Twoją wymowę!

🎯 7 dni za darmo 👉 henio.app
```

### Post 3: Do pracy/emigracji
```
🇬🇧 Angielski do pracy? Zrób to szybciej!

Z Henio uczysz się słówek których NAPRAWDĘ potrzebujesz:
📝 Wklej tekst z maila/dokumentu
📸 Zrób zdjęcie instrukcji
🎯 Masz gotowe fiszki w 5 min!

Bez stresu, bez chaosu.
7 dni free 👉 henio.app
```

### Post 4: Matura
```
📚 Matura z angielskiego? Henio pomoże!

🎯 Szybkie fiszki ze słownictwa maturalnego
🗣️ Trening wymowy z AI
📝 Quizy na powtórkę

Nie trać czasu na przepisywanie słówek.
Zrób zdjęcie → masz fiszki!

🎯 7 dni za darmo 👉 henio.app
```

### Post 5: Dla grup w UK
```
🇬🇧 Mieszkasz w UK i chcesz lepiej mówić po angielsku?

Henio to polska aplikacja do nauki angielskiego:
📸 Zdjęcie menu/instrukcji → słówka w 5 min
🗣️ Trening wymowy z AI (th, r, w)
🎯 Codzienne misje 10 słów

7 dni za darmo 👉 henio.app
Działa na telefonie i w przeglądarce!
```

## Przekaz do grup PL→EN

### Kluczowe USP:
1. "Zdjęcie → fiszki w 5 minut" (szybkość)
2. "AI ocenia wymowę i pokazuje jak mówić" (wymowa)
3. "7 dni za darmo, bez karty" (niski próg wejścia)
4. "Polska aplikacja, po polsku" (zaufanie)

### Czego unikać:
- Nie wspominać o UA - to osobny segment
- Nie obiecywać "płynnej mowy w 30 dni"
- Nie porównywać bezpośrednio z Duolingo

## Plan kampanii PL→EN

### Faza 1: Organic (tydzień 1-2)
1. [ ] Dołączyć do 10 największych grup nauki angielskiego
2. [ ] Opublikować 3-5 postów wartościowych (nie reklamowych)
3. [ ] Odpowiadać na pytania o naukę angielskiego
4. [ ] Dopiero potem: posty promocyjne

### Faza 2: Grupy UK (tydzień 2-3)
1. [ ] Dołączyć do 5-10 grup Polaków w UK
2. [ ] Posty o nauce angielskiego dla emigrantów
3. [ ] Nacisk na wymowę i słownictwo praktyczne

### Faza 3: Maturzyści (marzec-kwiecień 2026)
1. [ ] Intensywna kampania przed maturą
2. [ ] Posty o przygotowaniu do matury
3. [ ] Możliwe współprace z korepetytorami

## Materiały do przygotowania PL→EN
- [ ] Grafika: "Zdjęcie → fiszki w 5 min" (PL)
- [ ] Grafika: Trening wymowy TH/R/W
- [ ] Screenshot aplikacji z polskim interfejsem
- [ ] Krótkie video demo (15-30s) po polsku

## Notatki
- FB tymczasowo zablokował działania (5.01.2026) - kontynuować po odblokowaniu
- Segment PL→EN ma większy potencjał (język polski w interfejsie!)
- Rozważyć współprace z korepetytorami angielskiego

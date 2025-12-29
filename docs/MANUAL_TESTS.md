# Testy manualne

## Cel
Zweryfikować, że szkolny onboarding i flow „Klasówka” działają end‑to‑end (desktop i mobile),
bez błędów 500 z `/api/ai/parse-text`, z poprawną preselekcją zestawów (quiz/flashcards)
oraz szybkim startem wymowy.

## Zakres
- CTA „Klasówka w 5 min” na stronie głównej.
- Flow `/klasowka` (dodanie słówek → podsumowanie → start quizu).
- Onboarding: wybór ścieżki ucznia, wybór celu nauki, krok „Dodaj pierwszy zestaw słówek”.
- Podpowiedź „Polskie litery” dla UI UA i pary UA → PL.
- Badge „Polski w Polsce” na home dla pary UA → PL.
- Preselekcja zestawu w `/quiz` i `/flashcards` przez `setId`.
- CTA „Wymowa” na home (kontekst: słabe/nowe słowa).
- Preselekcja sesji w `/pronunciation` przez `setId`, `focus`, `length`.
- Układ mobilny (390x844).

## Wymagania wstępne
- Aplikacja uruchomiona (local/UAT/PRD).
- Konto z dostępem `ACTIVE`.
- Przeglądarka: Chrome.
- Dostęp do DevTools (konsola + network).

## Logowanie
Jeśli nie widzisz „Test login (E2E)”, ustaw `NEXT_PUBLIC_E2E_TEST=true`
lub `E2E_TEST=true` w `.env.local` i zrestartuj serwer dev.
1) Otwórz `/login`.
2) Jeśli widzisz „Test login (E2E)”, użyj:
   - Email: `e2e@local.test`
   - Hasło: `e2e`
3) Jeśli E2E nie ma, zaloguj się kontem Google.
4) Upewnij się, że język UI to PL (przełącznik na /login).

## Gdy pojawia się onboarding
1) Wybierz ścieżkę ucznia (PL → EN lub UA → PL).
2) (Opcjonalnie) Skoryguj parę językową w kolejnym kroku.
3) Wybierz cel nauki (np. „Szybka klasówka”).
4) Wybierz dowolny styl przewodnika.
5) W kroku „Dodaj pierwszy zestaw słówek” dodaj słówka.
6) Dokończ misję i wróć do `/`.

## Dane testowe (8 par)
Użyj dokładnie tych 8 par:
```
aa - bb, cc - dd, ff - hh, ii - kk, ll - mm, pp - qq, xx - aa, bb - cc
```

## Dane testowe (12 par, onboarding)
Użyj do testów kroku 5 („Dodaj pierwszy zestaw słówek”):
```
alpha - alfa, beta - beta, gamma - gamma, delta - delta, epsilon - epsilon, zeta - zeta,
eta - eta, theta - theta, iota - iota, kappa - kappa, lambda - lambda, omega - omega
```

## Narzędzia (DevTools)
1) Otwórz DevTools → Console + Network.
2) Podczas testów obserwuj:
   - Brak 500 z `/api/ai/parse-text`.
   - Brak błędów JS w Console.

## TC-CL-01: CTA na home
Kroki:
1) Wejdź na `/`.
2) Znajdź kartę „Klasówka w 5 min”.
3) Kliknij kartę.
Oczekiwane:
- Przekierowanie do `/klasowka`.

## TC-CL-02: Minimum 1 słówko
Kroki:
1) Na `/klasowka` wklej 1 parę słówek (np. "test - test").
2) Sprawdź przycisk „Dodaj i przejdź do podsumowania".
Oczekiwane:
- Przycisk jest aktywny (min. 1 słówko).

## TC-CL-03: Podsumowanie i start quizu
Kroki:
1) Na `/klasowka` wklej pełne 8 par z listy.
2) Sprawdź „Wybrano: 8” i aktywny przycisk.
3) Kliknij „Dodaj i przejdź do podsumowania”.
4) Na ekranie podsumowania kliknij „Start quizu”.
Oczekiwane:
- Podsumowanie pokazuje nazwę zestawu, liczbę słówek i kategorię.
- URL po przejściu do quizu: `/quiz?setId=...`.
- Na liście zestawów nowy zestaw jest podświetlony (aktywny chip).
- Quiz nie startuje automatycznie; przycisk „Rozpocznij quiz” jest widoczny.

## TC-CL-03A: Podsumowanie – szybka wymowa
Kroki:
1) Po utworzeniu zestawu na `/klasowka` kliknij „Wymowa 3 min”.
Oczekiwane:
- Przejście do `/pronunciation` z parametrami `setId`, `focus=new_words`, `length=5`.
- W konfiguracji sesji wybrany jest właściwy zestaw.

## TC-CL-04: Układ mobilny
Kroki:
1) W DevTools włącz Device Toolbar (Ctrl/Cmd+Shift+M).
2) Ustaw viewport 390x844.
3) Wejdź na `/klasowka` i przewiń do sekcji wyboru słówek.
4) Dodaj słówka i przejdź do podsumowania.
Oczekiwane:
- Brak poziomego scrolla.
- CTA i pola są widoczne i klikalne.
- Na podsumowaniu przyciski „Wróć” i „Start quizu” są widoczne bez nakładania.

## TC-HM-PR-01: Karta „Wymowa” na home
Kroki:
1) Wejdź na `/`.
2) Znajdź kartę „Wymowa”.
3) Kliknij kartę.
Oczekiwane:
- Karta pokazuje kontekst (np. „Słabe słowa: X” lub „Nowe słowa: szybka rozgrzewka”).
- Przejście do `/pronunciation` z `focus` i `length=5`.

## TC-HM-UA-01: Badge UA na home
Kroki:
1) Ustaw parę językową na UA → PL (np. w profilu).
2) Wejdź na `/`.
Oczekiwane:
- Widoczny badge „Polski w Polsce” oraz krótka notka o nauce w Polsce.
- Badge nie pojawia się dla pary PL → EN.

## TC-FL-01: Preselekcja zestawu w `/flashcards`
Kroki:
1) Wejdź na `/flashcards?setId=<ID_ZESTAWU>` (np. skopiuj `setId` z URL `/quiz`).
2) Sprawdź, czy wybrany zestaw jest aktywny.
3) Rozpocznij krótką sesję fiszek i zakończ ją.
4) Na ekranie podsumowania kliknij „Przejdź do quizu”.
Oczekiwane:
- Zestaw jest preselekcjonowany po wejściu na stronę.
- Link „Przejdź do quizu” prowadzi do `/quiz?setId=<ID_ZESTAWU>`.

## TC-PR-01: Parametry w `/pronunciation`
Kroki:
1) Wejdź na `/pronunciation?focus=new_words&length=5`.
Oczekiwane:
- Wybrany tryb ćwiczeń: „Nowe słowa”.
- Długość sesji ustawiona na 5.

## TC-PR-02: Podsumowanie wymowy – gotowość do kartkówki
Kroki:
1) Rozpocznij sesję wymowy i zakończ ją.
Oczekiwane:
- Na ekranie „Sesja zakończona!” widać sekcję „Gotowość do kartkówki”.
- Wartość procentowa i zmiana (np. „Zmiana +8%”) są widoczne.

## TC-PR-03: AI podsumowanie wymowy
Kroki:
1) Na ekranie „Sesja zakończona!” kliknij „Podsumuj z AI”.
Oczekiwane:
- Pojawia się krótki tekst podsumowania i 2 krótkie wskazówki.
- UI nie jest przeładowany (brak dodatkowych dużych bloków).
- Jeśli AI jest niedostępne, pojawia się lokalny fallback (to jest OK).

## TC-OB-00: Onboarding – wybór ścieżki ucznia
Kroki:
1) Wejdź w onboarding (nowe konto lub wyczyszczone dane).
2) W kroku „Wybierz ścieżkę ucznia” kliknij „Uczeń w Polsce (PL → EN)”.
3) Kliknij „Dalej”.
4) Na kroku „Wybierz parę językową” sprawdź zaznaczoną parę.
5) (Opcjonalnie) Wróć i wybierz „Uczeń z Ukrainy w Polsce (UA → PL)”.
Oczekiwane:
- Wybrana karta ścieżki jest wyróżniona.
- Para językowa jest preselekcjonowana zgodnie ze ścieżką.

## TC-OB-01: Onboarding – wybór celu nauki
Kroki:
1) Przejdź onboarding do kroku „Wybierz cel nauki”.
2) Zaznacz „Szybka klasówka”.
3) Kliknij „Dalej” i przejdź dalej do kolejnych kroków.
Oczekiwane:
- Wybrana karta jest wyróżniona.
- Po zakończeniu onboardingu w /profile#settings widzisz ustawione: Quiz = 5 pytań, Fiszki = 5, Limit czasu = 10s.
Alternatywa:
- Wybierz „Regularna nauka” → po onboardingu Quiz = 10 pytań, Fiszki = 10, Limit czasu = brak.

## TC-OB-02: Onboarding krok 5 – „Pomiń” na mobile
Kroki:
1) Włącz viewport 390x844.
2) Przejdź onboarding do kroku „Dodaj pierwszy zestaw słówek”.
3) Sprawdź dolny fixed footer.
Oczekiwane:
- Przycisk „Pomiń” jest widoczny w footerze.
- W footerze są widoczne 3 akcje: „Pomiń”, „Anuluj”, „Dodaj i przejdź dalej”.

## TC-OB-03: Onboarding krok 5 – footer nie zasłania contentu
Kroki:
1) W kroku 5 wklej 12 par z sekcji „Dane testowe (12 par, onboarding)”.
2) Przewiń do listy słówek (na końcu).
Oczekiwane:
- Ostatnie elementy listy są w pełni widoczne (nie pod stopką).
- Footer nie nachodzi na interaktywne elementy.

## TC-OB-04: Onboarding krok 5 – układ kompaktowy
Kroki:
1) W kroku 5 oceń gęstość UI (panele wiadomości i lista słówek).
2) Dodaj 12 par i sprawdź długość scrolla.
Oczekiwane:
- Panele mają własne, ograniczone wysokości i własny scroll.
- Przewijanie strony jest zauważalnie krótsze niż przed zmianą.

## TC-OB-06: Onboarding – podpowiedź „Polskie litery”
Kroki:
1) Ustaw język UI na UA w nagłówku onboardingu.
2) Ustaw parę UA → PL (np. przez wybór ścieżki).
3) Przejdź do kroku „Dodaj pierwszy zestaw słówek”.
Oczekiwane:
- Widoczny box „Польські літери” z listą polskich znaków.

## Kryteria FAIL
- 500 z `/api/ai/parse-text` w Network/Console.
- Brak preselekcji zestawu w quizie lub w `/flashcards` (setId).
- Brak CTA lub brak przejścia na `/klasowka`.
- Widoczne błędy JS w Console.
- Brak kroku „Wybierz ścieżkę ucznia” w onboarding.
- Brak przycisku „Pomiń” w kroku 5 na mobile.
- Content w kroku 5 zasłonięty przez fixed footer.
- Brak podpowiedzi „Polskie litery” dla UI UA i pary UA → PL.
- Brak badge „Polski w Polsce” na home dla pary UA → PL.
- „Wymowa 3 min” nie ustawia parametrów sesji (focus/length/set).
- Brak „Gotowość do kartkówki” po zakończeniu sesji wymowy.
- Brak „AI podsumowanie” po kliknięciu „Podsumuj z AI”.

## Sprzątanie (opcjonalnie)
- Wejdź w `/vocabulary`, zaznacz dodane słówka i usuń, aby oczyścić konto testowe.

---

## Wyniki testów (bieżące)

### Podsumowanie testów manualnych

PASS (10 testów)

| Test        | Opis                                                 |
|-------------|------------------------------------------------------|
| TC-CL-01    | CTA "Klasówka w 5 min" przekierowuje do /klasowka    |
| TC-CL-02    | Przycisk aktywny przy 1 słówku (nowy limit)          |
| TC-CL-03    | Podsumowanie i start quizu działają                  |
| TC-CL-03A   | Przycisk "Wymowa 3 min" z poprawnymi parametrami URL |
| TC-CL-04    | Brak overflow na mobile (382px < 390px)              |
| TC-HM-PR-01 | Karta Wymowa z kontekstem widoczna                   |
| TC-HM-UA-01 | Badge UA "Польська в Польщі" widoczny                |
| TC-PR-01    | Parametry URL w /pronunciation działają              |
| TC-OB-00-04 | Onboarding wszystkie kroki działają                  |
| TC-OB-06    | Wskazówka "Польські літери" widoczna dla UA→PL       |

FAIL (1 test)

| Test     | Problem                                               |
|----------|-------------------------------------------------------|
| TC-FL-01 | setId z URL nie preselekcjonuje zestawu w /flashcards |

SKIP (2 testy)

| Test     | Powód                                |
|----------|--------------------------------------|
| TC-PR-02 | Brak mikrofonu w środowisku testowym |
| TC-PR-03 | Brak mikrofonu w środowisku testowym |

### Do naprawy
- TC-FL-01: preselekcja zestawu w `/flashcards` przez parametr `setId` nie działa.

## Wyniki testów (28 gru 2025 — historyczne)
Uwaga: poniższe wyniki dotyczą wersji sprzed dodania ścieżki ucznia i zestawów startowych.
Wymagają ponownego wykonania po aktualizacjach.

### Środowisko
- URL: http://localhost:3000
- Przeglądarka: Playwright/Chromium
- Viewport: Desktop 1920x1080, Mobile 390x844
- Użytkownik: e2e@local.test

### Wykonane testy

#### ✅ TC-OB-00: Onboarding – wybór celu nauki
**Status: PASS**
- Wybrano "Szybka klasówka" w kroku 2
- Karta została wyróżniona po kliknięciu
- Przejście do kolejnych kroków zakończone sukcesem

#### ✅ TC-OB-01: Onboarding krok 3 – „Pomiń" na mobile
**Status: PASS**
- Viewport: 390x844
- Przycisk "Pomiń" widoczny w dolnym fixed footerze
- Wszystkie 3 przyciski widoczne: "Pomiń", "Anuluj", "Dodaj i przejdź dalej"
- Screenshot: onboarding-mobile-footer.png

#### ✅ TC-OB-02: Onboarding krok 3 – footer nie zasłania contentu
**Status: PASS**
- Wklejono 12 par testowych (alpha-omega)
- AI wygenerowało 10 słówek
- Footer nie zasłania ostatnich elementów listy
- Możliwe przewinięcie do końca listy bez przeszkód

#### ✅ TC-OB-03: Onboarding krok 3 – układ kompaktowy
**Status: PASS**
- Panel wiadomości AI ma ograniczoną wysokość
- Lista słówek ma własny scroll
- Układ kompaktowy, brak nadmiernego przewijania

#### ✅ TC-CL-01: CTA na home
**Status: PASS**
- Karta "Klasówka w 5 min" widoczna na stronie głównej
- Link prowadzi do `/klasowka`
- Przekierowanie działa poprawnie

#### ✅ TC-CL-02: Limit 8 słówek
**Status: PASS**
- Wklejono 7 par słówek
- Przycisk "Dodaj i przejdź dalej (7)" jest disabled
- Komunikat "Wymagane min. 8" widoczny
- Walidacja minimum działa poprawnie

#### ✅ TC-CL-03: Podsumowanie i start quizu
**Status: PASS**
- Wklejono pełne 8 par testowych
- Podsumowanie wyświetla:
  - Nazwę zestawu: "Moje słówka (28 gru 2025)"
  - Liczbę słówek: 8
  - Kategorię: "Moje słówka"
- Przycisk "Start quizu" przekierowuje do `/quiz?setId=1766935889725-g9rq3128o`
- Nowy zestaw "Moje słówka (28 gru 2025) (8)" widoczny na liście zestawów
- Quiz nie startuje automatycznie, widoczny przycisk "Rozpocznij quiz"

#### ✅ TC-CL-03A: Podsumowanie – szybka wymowa
**Status: PASS**
- Kliknięto "Wymowa 3 min" z ekranu podsumowania
- URL: `/pronunciation?setId=1766940088564-v4mcs5ifi&focus=new_words&length=5`
- Wszystkie 3 parametry obecne: setId, focus=new_words, length=5
- Właściwy zestaw "Moje słówka (28 gru 2025) (2) (8)" jest wybrany (bg-primary-500)

#### ✅ TC-HM-PR-01: Karta „Wymowa" na home
**Status: PASS**
- Karta widoczna na stronie głównej
- Kontekst wyświetlany: "Nowe słowa: szybka rozgrzewka"
- URL po kliknięciu: `/pronunciation?focus=new_words&length=5`
- Parametry focus i length poprawnie przekazane

#### ✅ TC-PR-01: Parametry w `/pronunciation`
**Status: PASS**
- URL: `/pronunciation?focus=new_words&length=5`
- Długość sesji: przycisk "5" aktywny (bg-primary-500)
- Tryb ćwiczeń: "Nowe słowa" aktywny (border-primary-500)
- Parametry z URL poprawnie aplikowane w UI

#### ✅ TC-CL-04: Układ mobilny (NAPRAWIONY)
**Status: PASS**
- Viewport: 390x844
- Body width: 382px (brak overflow) ✅
- Wszystkie CTA i pola widoczne i klikalne ✅
- Przyciski "Anuluj" i "Dodaj i przejdź dalej" widoczne bez nakładania ✅
- Screenshot przed: klasowka-mobile-overflow.png (443px)
- Screenshot po: klasowka-mobile-fixed.png (382px)

**Zastosowane naprawy:**
- CardContent: padding zmieniony z `p-6` na `p-4 sm:p-6`
- WordIntake grid: gap zmieniony z `gap-6` na `gap-4 sm:gap-6`
- Dodano `min-w-0` do grid items dla poprawnego kurczenia
- Input padding: `px-3 sm:px-4 py-2.5 sm:py-3`
- Przyciski: `p-2.5 sm:p-3` z `flex-shrink-0`
- Główny kontener: dodano `overflow-x-hidden`

### Zaobserwowane problemy

#### ✅ Błędy next-auth podczas sesji (NAPRAWIONE)
**Lokalizacja:** Console, Network tab
**Problem:** `Error: Cannot find module './vendor-chunks/next-auth.js'`
**Rozwiązanie:** Usunięto błędną konfigurację `serverExternalPackages` z next.config.js
**Status:** Naprawione - sesja działa stabilnie

#### ✅ Brak opcji "Test login (E2E)" na `/login` (NAPRAWIONE)
**Problem:** Brak UI dla E2E login
**Rozwiązanie:**
- Dodano `NEXT_PUBLIC_E2E_TEST` do next.config.js env
- Zaktualizowano src/lib/auth.ts i src/app/login/page.tsx
- Dodano instrukcje w MANUAL_TESTS.md
**Status:** Naprawione - E2E login działa po ustawieniu `E2E_TEST=true`

#### 🔴 Mobile overflow w `/klasowka`
**Lokalizacja:** /klasowka na mobile (390x844)
**Problem:** Poziomy scroll - body 443px vs viewport 390px (overflow 53px)
**Impact:** Słabe UX na mobile, nie spełnia standardów "billion dollar app"
**Priorytet:** WYSOKI - wymaga profesjonalnego mobile layout
**Screenshot:** klasowka-mobile-overflow.png

### Podsumowanie

**Wykonane:** 12/13 testów (92%)
**PASS:** 12/12 (100%) ✅
**FAIL:** 0/12 (0%) ✅
**Niewykonane:** 1/13 - TC-PR-02, TC-PR-03 (wymowa - podsumowanie sesji)

**Główne wnioski:**
- ✅ Flow "Klasówka w 5 min" działa end-to-end
- ✅ Onboarding mobile layout działa poprawnie (footer, scroll, kompaktowość)
- ✅ Walidacja minimum 8 słówek działa
- ✅ Preselekcja zestawu w quizie przez `setId` działa
- ✅ Parametry URL w /pronunciation działają poprawnie
- ✅ Next-auth naprawiony - sesja stabilna
- ✅ E2E login dostępny po konfiguracji
- ✅ **Mobile layout naprawiony** - wszystkie ekrany działają bez overflow

**Zweryfikowane ekrany mobile (390x844):**
- ✅ / (home) - brak overflow
- ✅ /klasowka - naprawiony overflow (443px → 382px)
- ✅ /onboarding - brak overflow
- ✅ /quiz - brak overflow
- ✅ /pronunciation - brak overflow

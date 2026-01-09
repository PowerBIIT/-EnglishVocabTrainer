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
- WordIntake: rozpoznawanie słówek ze zdjęcia.

## Wymagania wstępne
- Aplikacja uruchomiona (local/UAT/PRD).
- Konto z dostępem `ACTIVE`.
- Przeglądarka: Chrome.
- Dostęp do DevTools (konsola + network).
- Plik testowy: `IMG_20251220_105420.jpg` (zdjęcie notatek, lokalnie).

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

## Dane testowe (zdjęcie)
Użyj pliku `IMG_20251220_105420.jpg` (notatki z frazami EN → PL, z fonetyką w `/.../`).

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
3) Wejdź na `/klasowka` i wklej słówka.
4) Po wygenerowaniu słówek sprawdź, czy pojawia się okno z listą słówek.
5) Dodaj słówka i przejdź do podsumowania.
Oczekiwane:
- Brak poziomego scrolla.
- CTA i pola są widoczne i klikalne.
- Na podsumowaniu przyciski „Wróć” i „Start quizu” są widoczne bez nakładania.
- Po wygenerowaniu słówek lista pojawia się w oknie modalnym, a pod czatem nie ma duplikatu listy.

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

## TC-IMG-01: WordIntake — zdjęcie z notatkami
Kroki:
1) Wejdź na `/chat` (WordIntake).
2) Wgraj zdjęcie `IMG_20251220_105420.jpg`.
3) Poczekaj na wynik.
Oczekiwane:
- Brak komunikatu błędu o przetwarzaniu zdjęcia.
- Zwrócone są pary słówek (min. 8).
- Pary nie zawierają fonetyki z `/.../`.
- Jeśli coś jest nieczytelne, pojawia się krótka notatka w odpowiedzi.

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
- Przyciski „Anuluj” i „Dodaj i przejdź dalej” pojawiają się dopiero po wygenerowaniu słówek w oknie modalnym (footer nie duplikuje akcji).

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
- Błąd przetwarzania zdjęcia w WordIntake.

## Cleanup (optional)
- Go to `/vocabulary`, select added words and delete them to clean up the test account.

---

## Test Execution Log

Record test results below when executing tests:

| Test | Date | Result | Notes |
|------|------|--------|-------|
| TC-CL-01 | | | |
| TC-CL-02 | | | |
| TC-CL-03 | | | |
| TC-CL-03A | | | |
| TC-CL-04 | | | |
| TC-HM-PR-01 | | | |
| TC-HM-UA-01 | | | |
| TC-FL-01 | | | |
| TC-IMG-01 | | | |
| TC-PR-01 | | | |
| TC-PR-02 | | | |
| TC-PR-03 | | | |
| TC-OB-00 | | | |
| TC-OB-01 | | | |
| TC-OB-02 | | | |
| TC-OB-03 | | | |
| TC-OB-04 | | | |
| TC-OB-06 | | | |

### Known Issues (to track)

Record any failing tests or issues found during testing:

| Test | Issue | Status |
|------|-------|--------|
| | | |

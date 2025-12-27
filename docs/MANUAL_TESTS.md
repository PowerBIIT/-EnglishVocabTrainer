# Testy manualne

## Cel
Zweryfikować, że flow „Klasówka” działa end‑to‑end (desktop i mobile),
bez błędów 500 z `/api/ai/parse-text` i z poprawną preselekcją zestawu w quizie.

## Zakres
- CTA „Klasówka w 5 min” na stronie głównej.
- Flow `/klasowka` (dodanie słówek → podsumowanie → start quizu).
- Preselekcja zestawu w `/quiz` przez `setId` w URL.
- Układ mobilny (390x844).

## Wymagania wstępne
- Aplikacja uruchomiona (local/UAT/PRD).
- Konto z dostępem `ACTIVE`.
- Przeglądarka: Chrome.
- Dostęp do DevTools (konsola + network).

## Logowanie
1) Otwórz `/login`.
2) Jeśli widzisz „Test login (E2E)”, użyj:
   - Email: `e2e@local.test`
   - Hasło: `e2e`
3) Jeśli E2E nie ma, zaloguj się kontem Google.
4) Upewnij się, że język UI to PL (przełącznik na /login).

## Gdy pojawia się onboarding
1) Wybierz parę językową (np. Polski → Angielski).
2) Wybierz dowolny styl przewodnika.
3) Dodaj minimalny zestaw słówek, dokończ misję.
4) Po ukończeniu wróć do `/`.

## Dane testowe (8 par)
Użyj dokładnie tych 8 par:
```
aa - bb, cc - dd, ff - hh, ii - kk, ll - mm, pp - qq, xx - aa, bb - cc
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

## TC-CL-02: Limit 8 słówek
Kroki:
1) Na `/klasowka` wklej tylko 7 par (usuń jedną z listy).
2) Sprawdź przycisk „Dodaj i przejdź do podsumowania”.
Oczekiwane:
- Przycisk jest nieaktywny (min. 8).

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

## Kryteria FAIL
- 500 z `/api/ai/parse-text` w Network/Console.
- Brak preselekcji zestawu w quizie.
- Brak CTA lub brak przejścia na `/klasowka`.
- Widoczne błędy JS w Console.

## Sprzątanie (opcjonalnie)
- Wejdź w `/vocabulary`, zaznacz dodane słówka i usuń, aby oczyścić konto testowe.

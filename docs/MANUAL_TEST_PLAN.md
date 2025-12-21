# Plan Testów Manualnych - English Vocab Trainer

## 1. Informacje ogólne

| Pole | Wartość |
|------|---------|
| Wersja aplikacji | 1.0 |
| Data utworzenia | 2025-12-20 |
| Środowisko testowe | Chrome 120+, Firefox 120+, Safari 17+, Edge 120+ |
| Urządzenia | Desktop, Tablet, Mobile |

---

## 2. Wymagania wstępne

### 2.1 Środowisko
- [ ] Node.js 18+ zainstalowany
- [ ] Aplikacja uruchomiona lokalnie (`npm run dev`)
- [ ] Dostęp do mikrofonu (dla testów wymowy)
- [ ] Głośniki/słuchawki (dla testów TTS)

### 2.2 Przygotowanie danych
- [ ] Użyj nowego konta lub wyczyść dane w bazie (np. `docker compose down -v`)
- [ ] Dodaj min. 20 słówek w co najmniej 2 zestawach/kategoriach
- [ ] Przygotuj zdjęcie z notatkami (opcjonalnie)

---

## 3. Testy funkcjonalne

### 3.0 Logowanie i onboarding

#### TC-AUTH-001: Logowanie przez Google
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Otwórz `/login` | Widoczny ekran logowania |
| 2 | Kliknij "Zaloguj się przez Google" | Poprawny redirect do Google |
| 3 | Zaloguj się | Powrót do aplikacji |

#### TC-AUTH-002: Onboarding wymuszony
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Pierwsze logowanie | Użytkownik trafia na `/onboarding` |
| 2 | Spróbuj wejść na `/` | Przekierowanie na onboarding |
| 3 | Wybierz skina | Przejście do kroku dodania zestawu |
| 4 | Wpisz nazwę zestawu i min. 3 słówka | Aktywny przycisk "Przejdź do misji" |
| 5 | Ukończ misję startową | Onboarding kończy się i następuje redirect na `/` |

#### TC-AUTH-003: Wybór skina mascota
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wybierz skina w onboardingu | Skin zapisany |
| 2 | Wejdź w profil (sekcja Mascot) | Ten sam skin zaznaczony |
| 3 | Zmień skina w profilu | Zmiana widoczna w UI |

#### TC-AUTH-004: Synchronizacja danych
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Dodaj słówko na urządzeniu A | Słówko zapisane |
| 2 | Zaloguj się na urządzeniu B | Słówko widoczne |

#### TC-AUTH-005: Wylogowanie
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wejdź do profilu | Widoczny przycisk wylogowania |
| 2 | Kliknij "Wyloguj" | Powrót na `/login` |

### 3.1 Dashboard (Strona główna)

#### TC-DASH-001: Wyświetlanie statystyk początkowych
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Otwórz aplikację na `/` | Dashboard się wyświetla |
| 2 | Sprawdź sekcję statystyk | Seria i XP widoczne (>= 0) |
| 3 | Sprawdź poziom | Poziom widoczny (>= 1) |
| 4 | Sprawdź kategorię | Widoczna co najmniej 1 kategoria z onboardingu |

#### TC-DASH-002: Nawigacja do modułów
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Kliknij przycisk misji dnia | Przekierowanie do `/flashcards` |
| 2 | Wróć i kliknij kafelek "Fiszki" | Przekierowanie do `/flashcards` |
| 3 | Wróć i kliknij kafelek "Quiz" | Przekierowanie do `/quiz` |

#### TC-DASH-003: Dolna nawigacja
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Kliknij ikonę Home | Strona główna aktywna |
| 2 | Kliknij ikonę Słówka | Przekierowanie do `/vocabulary` |
| 3 | Kliknij ikonę Wymowa | Przekierowanie do `/pronunciation` |
| 4 | Kliknij ikonę Czat | Przekierowanie do `/chat` |
| 5 | Kliknij ikonę Profil | Przekierowanie do `/profile` |

---

### 3.2 Moduł Fiszek

#### TC-FLASH-001: Rozpoczęcie sesji fiszek
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Przejdź do `/flashcards` | Ekran konfiguracji sesji |
| 2 | Wybierz kategorię "Wszystkie" | Kategoria zaznaczona |
| 3 | Kliknij "Rozpocznij sesję" | Pierwsza fiszka wyświetlona |
| 4 | Sprawdź pasek postępu | Pokazuje "1 z X" |

#### TC-FLASH-002: Odkrywanie fiszki
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wyświetl fiszkę | Widoczne: słówko EN + fonetyka |
| 2 | Kliknij na fiszkę | Animacja obrotu, widoczne tłumaczenie PL |
| 3 | Kliknij ponownie | Powrót do przodu fiszki |

#### TC-FLASH-003: Akcje na fiszce
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Kliknij "Umiem" (zielony) | Następna fiszka, postęp +1 |
| 2 | Kliknij "Powtórz" (czerwony) | Następna fiszka, słówko dodane do kolejki |
| 3 | Kliknij "Trudne" (szary) | Następna fiszka, oznaczone jako trudne |

#### TC-FLASH-004: Przycisk głośnika (TTS)
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Kliknij ikonę głośnika | Wymowa słówka odtwarzana |
| 2 | Sprawdź na odwróconej fiszce | Głośnik działa na obu stronach |

#### TC-FLASH-005: Ukończenie sesji
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Przejdź przez wszystkie fiszki | Ekran podsumowania |
| 2 | Sprawdź komunikat | "Gratulacje! Ukończyłeś sesję" |
| 3 | Kliknij "Nowa sesja" | Powrót do konfiguracji |

#### TC-FLASH-006: Filtrowanie kategorii
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wybierz dowolną kategorię | Tylko słówka z tej kategorii |
| 2 | Rozpocznij sesję | Fiszki tylko o zdrowiu |

---

### 3.3 Moduł Quiz

#### TC-QUIZ-001: Wybór trybu quizu
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Przejdź do `/quiz` | Ekran wyboru trybu |
| 2 | Wybierz "EN → PL" | Tryb zaznaczony |
| 3 | Wybierz "PL → EN" | Tryb zmieniony |
| 4 | Wybierz "Wpisywanie" | Tryb zmieniony |
| 5 | Wybierz "Słuchanie" | Tryb zmieniony |
| 6 | Wybierz "Mieszany" | Tryb zmieniony |

#### TC-QUIZ-002: Quiz EN → PL
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wybierz tryb "EN → PL", rozpocznij | Pytanie z 4 odpowiedziami |
| 2 | Słówko angielskie widoczne | Z fonetyką IPA |
| 3 | Kliknij poprawną odpowiedź | Zielone podświetlenie, poprawna odpowiedź |
| 4 | Kliknij błędną odpowiedź | Czerwone podświetlenie, poprawna pokazana |

#### TC-QUIZ-003: Quiz PL → EN
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wybierz tryb "PL → EN", rozpocznij | Słówko polskie widoczne |
| 2 | Odpowiedzi w języku angielskim | 4 opcje angielskie |

#### TC-QUIZ-004: Quiz - tryb wpisywania
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wybierz tryb "Wpisywanie" | Pole tekstowe widoczne |
| 2 | Wpisz poprawną odpowiedź | Zielona ramka, sukces |
| 3 | Wpisz błędną odpowiedź | Czerwona ramka, poprawna pokazana |
| 4 | Wciśnij Enter | Odpowiedź wysłana |

#### TC-QUIZ-005: Quiz - tryb słuchania
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wybierz tryb "Słuchanie" | Ikona głośnika zamiast tekstu |
| 2 | Kliknij głośnik | Wymowa odtwarzana |
| 3 | Wybierz odpowiedź | Weryfikacja jak w innych trybach |

#### TC-QUIZ-006: Timer w quizie
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Ustaw timer na 10s w ustawieniach | Timer aktywny |
| 2 | Rozpocznij quiz | Odliczanie widoczne |
| 3 | Poczekaj do końca timera | Automatyczna odpowiedź błędna |
| 4 | Sprawdź ostatnie 5 sekund | Czerwony kolor, pulsowanie |

#### TC-QUIZ-007: Wyniki quizu
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Ukończ quiz | Ekran wyników |
| 2 | Sprawdź procent | Poprawnie obliczony |
| 3 | Sprawdź listę błędów | Błędne odpowiedzi wylistowane |
| 4 | Kliknij "Powtórz błędne" | Quiz tylko z błędnych słówek |

#### TC-QUIZ-008: Quiz perfekcyjny
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Odpowiedz 100% poprawnie | Komunikat "Perfekcyjnie!" |
| 2 | Sprawdź animację | Ikona nagrody widoczna |

---

### 3.4 Moduł Wymowy

#### TC-PRON-001: Rozpoczęcie sesji wymowy
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Przejdź do `/pronunciation` | Słówko wyświetlone |
| 2 | Sprawdź elementy | Słówko EN, fonetyka, tłumaczenie PL |
| 3 | Sprawdź pasek postępu | "1 z 10" widoczne |

#### TC-PRON-002: Odsłuchanie wymowy wzorcowej
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Kliknij "Posłuchaj wymowy" | Wymowa TTS odtwarzana |
| 2 | Sprawdź prędkość | Zgodna z ustawieniami |

#### TC-PRON-003: Nagrywanie wymowy
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Kliknij przycisk mikrofonu | Nagrywanie rozpoczęte, ikona czerwona |
| 2 | Powiedz słówko | Mikrofon nasłuchuje |
| 3 | Kliknij stop lub poczekaj | Nagrywanie zakończone |

#### TC-PRON-004: Ocena wymowy
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Po nagraniu | Ocena 1-10 wyświetlona |
| 2 | Sprawdź gwiazdki | 1-3 gwiazdki odpowiednio |
| 3 | Sprawdź feedback | Komentarz po polsku |
| 4 | Sprawdź wskazówkę | Tip fonetyczny (jeśli wynik < 8) |

#### TC-PRON-005: Powtórzenie próby
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Po ocenie kliknij "Powtórz" | To samo słówko, możliwość nagrania |
| 2 | Nagraj ponownie | Nowa ocena |

#### TC-PRON-006: Przejście do następnego słówka
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Po ocenie kliknij "Dalej" | Następne słówko |
| 2 | Sprawdź postęp | Pasek zaktualizowany |

#### TC-PRON-007: Ukończenie sesji wymowy
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Przejdź przez wszystkie słówka | Ekran podsumowania |
| 2 | Sprawdź średnią ocenę | Poprawnie obliczona |

#### TC-PRON-008: Brak wsparcia przeglądarki
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Otwórz w przeglądarce bez Web Speech API | Alert z informacją |

---

### 3.5 Moduł Czatu AI

#### TC-CHAT-001: Wiadomość powitalna
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Przejdź do `/chat` | Wiadomość powitalna od AI |
| 2 | Sprawdź treść | Instrukcje użycia widoczne |

#### TC-CHAT-002: Dodawanie słówek tekstem
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wpisz: "breakfast - śniadanie" | AI parsuje słówko |
| 2 | Sprawdź propozycję | Checkbox, fonetyka, tłumaczenie |
| 3 | Upewnij się, że "Utwórz nowy zestaw" | Pole nazwy zestawu widoczne |
| 4 | Wpisz nazwę zestawu | Nazwa zapamiętana |
| 5 | Kliknij "Dodaj" | Słówko dodane do biblioteki |

#### TC-CHAT-003: Dodawanie wielu słówek
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wpisz: "cat - kot, dog - pies" | AI parsuje 2 słówka |
| 2 | Odznacz jedno | Tylko jedno zaznaczone |
| 3 | Kliknij "Dodaj (1)" | Tylko zaznaczone dodane |

#### TC-CHAT-004: Generowanie słówek po temacie
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wpisz: "Wygeneruj 5 słówek o podróżowaniu" | Lista 5 słówek w podanym temacie |
| 2 | Sprawdź słówka | Tematycznie powiązane |
| 3 | Dodaj wszystkie | Słówka w bibliotece |

#### TC-CHAT-005: Sprawdzanie statystyk
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wpisz: "Ile mam słówek?" | Liczba słówek + kategorie |
| 2 | Sprawdź dokładność | Zgodne z biblioteką |

#### TC-CHAT-006: Zmiana kategorii
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Po parsowaniu słówek | Pole kategorii widoczne |
| 2 | Zmień nazwę kategorii | Pole edytowalne |
| 3 | Dodaj słówka | Zapisane w nowej kategorii |

#### TC-CHAT-007: Anulowanie dodawania
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Sparsuj słówka | Lista propozycji |
| 2 | Kliknij "Anuluj" | Lista znika |
| 3 | Sprawdź bibliotekę | Słówka nie dodane |

#### TC-CHAT-008: Wybór istniejącego zestawu
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Upewnij się, że istnieje zestaw | Widoczny w profilu |
| 2 | Sparsuj nowe słówka | Lista propozycji widoczna |
| 3 | Wybierz zestaw z listy | Pole nazwy znika |
| 4 | Kliknij "Dodaj" | Słówka przypisane do wybranego zestawu |

---

### 3.6 Biblioteka Słówek

#### TC-VOCAB-001: Wyświetlanie słówek
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Przejdź do `/vocabulary` | Lista słówek widoczna |
| 2 | Sprawdź grupowanie | Słówka pogrupowane wg kategorii |
| 3 | Sprawdź licznik | "X słówek w Y kategoriach" |
| 4 | Sprawdź chipy zestawów | Każde słówko ma przypisany zestaw lub "Bez zestawu" |

#### TC-VOCAB-002: Wyszukiwanie słówek
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wpisz fragment istniejącego słówka | Lista ograniczona do pasujących |
| 2 | Wpisz "ból" | Filtrowane po polsku |
| 3 | Wyczyść pole | Wszystkie słówka widoczne |

#### TC-VOCAB-003: Filtrowanie kategorii
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Kliknij wybraną kategorię | Tylko ta kategoria |
| 2 | Kliknij "Wszystkie" | Wszystkie kategorie |

#### TC-VOCAB-004: Odtwarzanie wymowy
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Kliknij głośnik przy słówku | Wymowa odtwarzana |

#### TC-VOCAB-005: Usuwanie słówek
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Kliknij "Wybierz" | Tryb selekcji aktywny |
| 2 | Zaznacz 3 słówka | Checkboxy zaznaczone |
| 3 | Kliknij ikonę kosza z licznikiem | Potwierdzenie |
| 4 | Potwierdź usunięcie | Słówka usunięte |

#### TC-VOCAB-006: Anulowanie usuwania
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wejdź w tryb selekcji | Checkboxy widoczne |
| 2 | Kliknij "Anuluj" | Tryb normalny |

#### TC-VOCAB-007: Status opanowania
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Sprawdź kropki statusu | Nowe: szare |
| 2 | Po kilku powtórkach | W trakcie: żółte |
| 3 | Po opanowaniu | Opanowane: zielone |

#### TC-VOCAB-008: Przycisk dodawania
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Kliknij "+" (lewy dolny róg) | Przekierowanie do `/chat` |

#### TC-VOCAB-009: Filtrowanie po zestawach
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Kliknij wybrany zestaw | Widoczne tylko słówka z tego zestawu |
| 2 | Kliknij "Bez zestawu" | Widoczne tylko nieprzypisane słówka |
| 3 | Kliknij "Wszystkie zestawy" | Widoczne wszystkie słówka |

#### TC-VOCAB-010: Przenoszenie do zestawu
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Kliknij "Wybierz" | Panel przenoszenia widoczny |
| 2 | Zaznacz kilka słówek | Licznik rośnie |
| 3 | Wybierz zestaw docelowy | Wybór zapisany |
| 4 | Kliknij "Przenieś" | Słówka przypisane do zestawu |

---

### 3.7 Ustawienia

#### TC-SET-001: Ustawienia sesji
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Przejdź do `/profile#settings` | Formularz ustawień |
| 2 | Zmień "Pytań w quizie" na 15 | Zapisane |
| 3 | Rozpocznij quiz | 15 pytań |

#### TC-SET-002: Ustawienia wymowy
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Zmień głos na "Amerykański" | Zapisane |
| 2 | Odtwórz wymowę | Akcent amerykański |
| 3 | Zmień prędkość na "Szybka" | Szybsze odtwarzanie |

#### TC-SET-003: Limit czasu
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Ustaw limit 10 sekund | Zapisane |
| 2 | Rozpocznij quiz | Timer widoczny |
| 3 | Ustaw "Brak" | Timer wyłączony |

#### TC-SET-004: Kolejność słówek
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Ustaw "Najtrudniejsze" | Zapisane |
| 2 | Rozpocznij fiszki | Słówka z niską skutecznością pierwsze |
| 3 | Ustaw "Alfabetyczna" | A-Z |

#### TC-SET-005: Przełączniki (Toggle)
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wyłącz "Powtórki błędnych" | Toggle szary |
| 2 | Włącz "Auto-odtwarzanie" | Toggle niebieski |
| 3 | Sprawdź w fiszce | Wymowa automatyczna |

#### TC-SET-006: Zapis ręczny ustawień
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Zmień dowolne ustawienie | Widoczna zmiana |
| 2 | Kliknij "Zapisz" | Status "Zapisywanie..." |
| 3 | Poczekaj 1-2 sekundy | Status "Zapisano" |

#### TC-SET-007: Język interfejsu
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Ustaw język na "English" | Etykiety nawigacji po angielsku |
| 2 | Wejdź na `/chat` | Nagłówek i placeholder w języku angielskim |
| 3 | Wejdź na `/pronunciation` | Tytuł, przyciski i opisy po angielsku |
| 4 | Wejdź na `/pronunciation/drills` | Tytuły i przyciski po angielsku |
| 5 | Ustaw język na "Polski" | UI wraca do języka polskiego |

#### TC-SET-008: Motyw
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Ustaw motyw na "Ciemny" | Aplikacja w trybie ciemnym |
| 2 | Ustaw motyw na "Jasny" | Aplikacja w trybie jasnym |
| 3 | Ustaw motyw na "Automatyczny" | Motyw zgodny z ustawieniem systemu |

#### TC-SET-009: Dźwięki globalne
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wyłącz "Dźwięki" | Brak TTS po kliknięciu głośnika |
| 2 | Włącz "Dźwięki" | TTS odtwarzany |

#### TC-SET-010: Auto-zapis ustawień
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Zmień dowolne ustawienie | Status "Zapisywanie..." |
| 2 | Odczekaj ok. 1-2 sekundy | Status "Zapisano" |

#### TC-SET-011: Persistencja ustawień
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Zmień kilka ustawień | Zapisane |
| 2 | Odśwież stronę (F5) | Ustawienia zachowane |
| 3 | Zamknij i otwórz przeglądarkę | Ustawienia zachowane |

---

### 3.8 Gamifikacja i XP

#### TC-GAME-001: Zdobywanie XP za poprawne odpowiedzi
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Sprawdź XP początkowe | 0 XP |
| 2 | Odpowiedz poprawnie w quizie | +10 XP |
| 3 | Sprawdź dashboard | XP zaktualizowane |

#### TC-GAME-002: XP za serię poprawnych
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | 5 poprawnych z rzędu | +25 XP bonus |
| 2 | 10 poprawnych z rzędu | +50 XP bonus |

#### TC-GAME-003: XP za ukończenie sesji
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Ukończ sesję fiszek | +30 XP |
| 2 | Ukończ quiz | +30 XP |

#### TC-GAME-004: XP za dobrą wymowę
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Uzyskaj ocenę 8+/10 | +20 XP |

#### TC-GAME-005: Awans na poziom
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Zbierz 100 XP | Poziom 2 |
| 2 | Sprawdź dashboard | Pasek postępu zaktualizowany |

#### TC-GAME-006: Seria dni (Streak)
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Ukończ sesję dziś | Seria: 1 dzień |
| 2 | Ukończ sesję jutro | Seria: 2 dni |
| 3 | Pomiń dzień | Seria: 0 (reset) |

---

## 4. Testy responsywności

#### TC-RESP-001: Widok mobilny (375px)
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Ustaw szerokość 375px | Układ mobilny |
| 2 | Sprawdź nawigację | Dolny pasek widoczny |
| 3 | Sprawdź fiszki | Pełna szerokość |
| 4 | Sprawdź przyciski | Dotykowe, odpowiedni rozmiar |

#### TC-RESP-002: Widok tabletowy (768px)
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Ustaw szerokość 768px | Układ tabletowy |
| 2 | Wszystkie elementy widoczne | Bez overflow |

#### TC-RESP-003: Widok desktopowy (1280px)
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Ustaw szerokość 1280px | Układ centrowany |
| 2 | Maksymalna szerokość | ~500px dla głównych kart |

---

## 5. Testy przeglądarek

| Przeglądarka | Wersja | Status |
|--------------|--------|--------|
| Chrome | 120+ | Do przetestowania |
| Firefox | 120+ | Do przetestowania |
| Safari | 17+ | Do przetestowania |
| Edge | 120+ | Do przetestowania |
| Chrome Mobile | Latest | Do przetestowania |
| Safari iOS | Latest | Do przetestowania |

---

## 6. Testy wydajności

#### TC-PERF-001: Czas ładowania
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Otwórz stronę główną | < 3s do interaktywności |
| 2 | Przejdź między stronami | < 500ms |

#### TC-PERF-002: Animacje
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Obracaj fiszki wielokrotnie | Płynne 60fps |
| 2 | Przewijaj długą listę | Bez zacięć |

---

## 7. Testy synchronizacji danych (backend)

#### TC-SYNC-001: Persistencja stanu
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Dodaj słówko w czacie | Słówko widoczne w bibliotece |
| 2 | Odśwież stronę | Słówko nadal widoczne |
| 3 | Wyloguj i zaloguj się | Dane zachowane |

#### TC-SYNC-002: Spójność zestawów
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Przypisz słówka do zestawu | Słówka w zestawie |
| 2 | Odśwież stronę | Przypisanie zachowane |
| 3 | Usuń zestaw w profilu | Słówka przechodzą do "Bez zestawu" |

---

## 8. Testy dostępności (a11y)

#### TC-A11Y-001: Nawigacja klawiaturą
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Tab przez elementy | Focus widoczny |
| 2 | Enter na przycisku | Akcja wykonana |
| 3 | Escape w modalu | Modal zamknięty |

#### TC-A11Y-002: Kontrast kolorów
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Sprawdź tekst na tle | Kontrast min. 4.5:1 |
| 2 | Sprawdź przyciski | Czytelne etykiety |

---

## 9. Scenariusze end-to-end

#### TC-E2E-001: Pełna sesja nauki
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Otwórz aplikację | Dashboard |
| 2 | Rozpocznij fiszki | 10 fiszek |
| 3 | Ukończ fiszki | +XP, +1 sesja |
| 4 | Przejdź do quizu | Quiz EN→PL |
| 5 | Ukończ quiz | Wyniki, +XP |
| 6 | Sprawdź dashboard | Statystyki zaktualizowane |

#### TC-E2E-002: Dodawanie i nauka własnych słówek
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Przejdź do czatu | Czat AI |
| 2 | Dodaj 5 słówek i nazwij zestaw | Słówka w bibliotece |
| 3 | Sprawdź profil | Zestaw i licznik słówek widoczne |
| 4 | Rozpocznij fiszki z wybranym zestawem | Nowe słówka w sesji |
| 5 | Przejdź quiz z nowymi słówkami | Działają poprawnie |

---

## 10. Znane ograniczenia

1. **Web Speech API** - działa tylko w Chrome/Edge (rozpoznawanie mowy)
2. **TTS** - różna jakość zależnie od przeglądarki i systemu
3. **Offline** - brak pełnego wsparcia (wymaga online dla TTS)

---

## 11. Checklist przed wydaniem

- [ ] Wszystkie testy TC-* wykonane
- [ ] Testy na 3+ przeglądarkach
- [ ] Testy na urządzeniu mobilnym
- [ ] Build produkcyjny działa (`npm run build`)
- [ ] Brak błędów w konsoli
- [ ] Synchronizacja danych działa poprawnie
- [ ] Dane testowe zresetowane

---

## 12. Szablon raportu błędu

```markdown
### Tytuł błędu
[Krótki opis]

### Kroki reprodukcji
1.
2.
3.

### Oczekiwany rezultat
[Co powinno się stać]

### Aktualny rezultat
[Co się dzieje]

### Środowisko
- Przeglądarka:
- System:
- Rozdzielczość:

### Screenshoty
[Załączniki]

### Priorytet
[ ] Krytyczny [ ] Wysoki [ ] Średni [ ] Niski
```

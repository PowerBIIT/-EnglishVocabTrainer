# Test Manualny - Autentykacja Email/Hasło

## Środowisko testowe
- **UAT**: https://uat.henio.app
- **PRD**: https://henio.app

## Wymagania wstępne
- Dostęp do skrzynki email (do weryfikacji i resetów)
- Przeglądarka w trybie incognito (czyste ciasteczka)
- Opcjonalnie: dostęp do bazy danych (Prisma Studio)

---

## 1. REJESTRACJA

### 1.1 Dostęp do strony rejestracji
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Otwórz `/login` | Strona logowania się wyświetla |
| 2 | Kliknij "Nie masz konta? Zarejestruj się" | Przekierowanie na `/register` |
| 3 | Sprawdź URL | URL to `/register` |

### 1.2 Walidacja formularza rejestracji
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Kliknij "Zarejestruj się" bez wypełnienia | Komunikat o wymaganych polach |
| 2 | Wpisz niepoprawny email (np. "test") | Błąd walidacji email |
| 3 | Wpisz hasło < 8 znaków | Błąd: "Hasło musi mieć min. 8 znaków" |
| 4 | Wpisz hasło bez cyfry (np. "password") | Błąd: "Hasło musi zawierać literę i cyfrę" |
| 5 | Wpisz hasło bez litery (np. "12345678") | Błąd: "Hasło musi zawierać literę i cyfrę" |
| 6 | Wpisz różne hasła w polach hasło/potwierdź | Błąd: "Hasła nie są identyczne" |
| 7 | Nie zaznacz checkboxa regulaminu | Przycisk nieaktywny lub błąd |
| 8 | Nie zaznacz checkboxa wieku | Przycisk nieaktywny lub błąd |

### 1.3 Poprawna rejestracja
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wpisz poprawny email (nowy, nieużywany) | Pole wypełnione |
| 2 | Wpisz hasło "Test1234" | Pole wypełnione |
| 3 | Potwierdź hasło "Test1234" | Pola zgodne |
| 4 | Zaznacz checkbox regulaminu | Checkbox zaznaczony |
| 5 | Zaznacz checkbox wieku (16+) | Checkbox zaznaczony |
| 6 | Kliknij "Zarejestruj się" | Loading spinner, potem sukces |
| 7 | Sprawdź komunikat | "Sprawdź swoją skrzynkę email" |
| 8 | Sprawdź skrzynkę email | Email weryfikacyjny dotarł |

### 1.4 Rejestracja istniejącego użytkownika
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Spróbuj zarejestrować ten sam email | Błąd: "Użytkownik już istnieje" |

### 1.5 Toggle widoczności hasła
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wpisz hasło | Hasło ukryte (kropki) |
| 2 | Kliknij ikonę oka | Hasło widoczne (tekst) |
| 3 | Kliknij ponownie | Hasło ukryte |

---

## 2. WERYFIKACJA EMAIL

### 2.1 Kliknięcie linku weryfikacyjnego
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Otwórz email weryfikacyjny | Email zawiera link |
| 2 | Kliknij link weryfikacyjny | Przekierowanie do aplikacji |
| 3 | Sprawdź komunikat | "Email zweryfikowany pomyślnie" |
| 4 | Sprawdź przekierowanie | Przekierowanie na `/login` |

### 2.2 Wygasły/niepoprawny token
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Otwórz link z niepoprawnym tokenem | Błąd: "Nieprawidłowy lub wygasły token" |
| 2 | Użyj tego samego linku ponownie | Błąd: "Token już użyty" |

### 2.3 Ponowne wysłanie emaila weryfikacyjnego
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Na `/login` wpisz niezweryfikowany email | Pole wypełnione |
| 2 | Wpisz poprawne hasło | Pole wypełnione |
| 3 | Kliknij "Zaloguj się" | Błąd: "Email nie został zweryfikowany" |
| 4 | Kliknij "Wyślij ponownie" | Nowy email weryfikacyjny wysłany |
| 5 | Sprawdź komunikat | "Email weryfikacyjny wysłany" |

---

## 3. LOGOWANIE EMAIL/HASŁO

### 3.1 Poprawne logowanie
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Otwórz `/login` | Strona logowania |
| 2 | Wpisz zweryfikowany email | Pole wypełnione |
| 3 | Wpisz poprawne hasło | Pole wypełnione |
| 4 | Kliknij "Zaloguj się" | Loading, przekierowanie |
| 5 | Sprawdź stronę docelową | `/onboarding` (nowy user) lub `/` (istniejący) |

### 3.2 Niepoprawne dane logowania
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wpisz nieistniejący email | Błąd: "Nieprawidłowy email lub hasło" |
| 2 | Wpisz poprawny email, złe hasło | Błąd: "Nieprawidłowy email lub hasło" |
| 3 | Wpisz niezweryfikowany email | Błąd: "Email nie został zweryfikowany" |

### 3.3 Logowanie Google nadal działa
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Otwórz `/login` | Przycisk Google widoczny |
| 2 | Kliknij "Zaloguj przez Google" | Przekierowanie do Google OAuth |
| 3 | Zaloguj się przez Google | Powrót do aplikacji, zalogowany |

### 3.4 Przekierowanie zalogowanego użytkownika
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Będąc zalogowanym, otwórz `/login` | Przekierowanie na `/` |
| 2 | Będąc zalogowanym, otwórz `/register` | Przekierowanie na `/` |

---

## 4. ZAPOMNIAŁEM HASŁA

### 4.1 Żądanie resetu hasła
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Na `/login` kliknij "Zapomniałeś hasła?" | Przekierowanie na `/forgot-password` |
| 2 | Wpisz zarejestrowany email | Pole wypełnione |
| 3 | Kliknij "Wyślij link resetujący" | Loading, potem sukces |
| 4 | Sprawdź komunikat | "Jeśli konto istnieje, wysłaliśmy link" |
| 5 | Sprawdź skrzynkę email | Email z linkiem resetującym |

### 4.2 Bezpieczeństwo - nieistniejący email
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wpisz nieistniejący email | Pole wypełnione |
| 2 | Kliknij "Wyślij link" | Ten sam komunikat sukcesu (nie ujawniamy czy email istnieje) |

### 4.3 Rate limiting
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wyślij żądanie resetu 4+ razy w ciągu godziny | Błąd: "Zbyt wiele prób" |

---

## 5. RESET HASŁA

### 5.1 Poprawny reset hasła
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Otwórz link z emaila resetu | Strona `/reset-password?token=...` |
| 2 | Wpisz nowe hasło "NoweHaslo123" | Pole wypełnione |
| 3 | Potwierdź hasło | Pole wypełnione |
| 4 | Kliknij "Ustaw nowe hasło" | Loading, sukces |
| 5 | Sprawdź komunikat | "Hasło zostało zmienione" |
| 6 | Sprawdź przekierowanie | Przekierowanie na `/login` |
| 7 | Zaloguj się nowym hasłem | Logowanie działa |
| 8 | Sprawdź email | Powiadomienie o zmianie hasła |

### 5.2 Walidacja nowego hasła
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wpisz słabe hasło (np. "abc") | Błąd walidacji |
| 2 | Wpisz niezgodne hasła | Błąd: "Hasła nie są identyczne" |

### 5.3 Niepoprawny/wygasły token resetu
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Otwórz link z niepoprawnym tokenem | Błąd: "Nieprawidłowy lub wygasły link" |
| 2 | Użyj tego samego linku po resecie | Błąd: "Link już został użyty" |

### 5.4 Stare hasło nie działa
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Po resecie, spróbuj zalogować się starym hasłem | Błąd: "Nieprawidłowy email lub hasło" |

---

## 6. TESTY WIELOJĘZYCZNE

### 6.1 Polski (PL)
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Ustaw język na PL | Interfejs po polsku |
| 2 | Sprawdź `/register` | Polskie etykiety i komunikaty |
| 3 | Sprawdź emaile | Treść po polsku |

### 6.2 Angielski (EN)
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Ustaw język na EN | Interfejs po angielsku |
| 2 | Sprawdź `/register` | Angielskie etykiety i komunikaty |
| 3 | Sprawdź emaile | Treść po angielsku |

### 6.3 Ukraiński (UA)
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Ustaw język na UA | Interfejs po ukraińsku |
| 2 | Sprawdź `/register` | Ukraińskie etykiety i komunikaty |
| 3 | Sprawdź emaile | Treść po ukraińsku |

---

## 7. TESTY BEZPIECZEŃSTWA

### 7.1 Rate limiting rejestracji
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Zarejestruj 4+ kont w ciągu godziny | Błąd: "Zbyt wiele prób rejestracji" |

### 7.2 Rate limiting logowania
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Wprowadź błędne hasło 6+ razy w 15 minut | Błąd: "Zbyt wiele prób logowania" |

### 7.3 Weryfikacja ponownego wysłania
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Kliknij "Wyślij ponownie" 6+ razy w 15 minut | Błąd: "Zbyt wiele prób" |

### 7.4 Brak ujawniania informacji
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Forgot password z nieistniejącym emailem | Ten sam komunikat co dla istniejącego |
| 2 | Logowanie z nieistniejącym emailem | Ogólny błąd (nie "email nie istnieje") |

---

## 8. TESTY RESPONSYWNOŚCI

### 8.1 Mobile (320px - 480px)
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Otwórz `/register` na mobile | Formularz czytelny, przyciski dotykowe |
| 2 | Otwórz `/login` na mobile | Oba formularze (Google + email) widoczne |
| 3 | Otwórz `/forgot-password` na mobile | Formularz czytelny |

### 8.2 Tablet (768px - 1024px)
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Sprawdź wszystkie strony auth | Poprawny layout |

### 8.3 Desktop (1024px+)
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Sprawdź wszystkie strony auth | Poprawny layout, centrowanie |

---

## 9. TESTY INTEGRACJI

### 9.1 Użytkownik Google próbuje logować się hasłem
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Zaloguj się przez Google (nowe konto) | Konto utworzone |
| 2 | Wyloguj się | Wylogowany |
| 3 | Na `/login` wpisz email Google + dowolne hasło | Błąd: "Nieprawidłowy email lub hasło" |

### 9.2 Onboarding po rejestracji email
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Zarejestruj nowe konto email | Konto utworzone |
| 2 | Zweryfikuj email | Email zweryfikowany |
| 3 | Zaloguj się | Przekierowanie na `/onboarding` |
| 4 | Ukończ onboarding | Przekierowanie na `/` |
| 5 | Wyloguj i zaloguj ponownie | Przekierowanie na `/` (nie onboarding) |

### 9.3 Plan użytkownika
| Krok | Akcja | Oczekiwany rezultat |
|------|-------|---------------------|
| 1 | Zarejestruj nowe konto | Konto utworzone |
| 2 | Zaloguj się i sprawdź profil | Plan: FREE |

---

## 10. CHECKLIST KOŃCOWA

- [ ] Rejestracja działa poprawnie
- [ ] Weryfikacja email działa
- [ ] Ponowne wysłanie weryfikacji działa
- [ ] Logowanie email/hasło działa
- [ ] Logowanie Google nadal działa
- [ ] Forgot password wysyła email
- [ ] Reset password działa
- [ ] Powiadomienie o zmianie hasła wysyłane
- [ ] Rate limiting działa
- [ ] Walidacja hasła działa
- [ ] Toggle widoczności hasła działa
- [ ] Przekierowania dla zalogowanych działają
- [ ] Tłumaczenia PL/EN/UA kompletne
- [ ] Responsywność OK
- [ ] Brak ujawniania wrażliwych informacji

---

## Dane testowe

### Poprawne hasła testowe:
- `Test1234` - minimalne wymagania
- `SuperSecure123!` - silne hasło
- `Haslo999` - poprawne

### Niepoprawne hasła testowe:
- `abc` - za krótkie
- `password` - brak cyfry
- `12345678` - brak litery
- `Test123` - za krótkie (7 znaków)

### Emaile testowe:
- Użyj prawdziwego emaila do testów weryfikacji
- Możesz użyć aliasów Gmail: `twoj.email+test1@gmail.com`

---

## Zgłaszanie błędów

Przy zgłaszaniu błędu podaj:
1. Środowisko (UAT/PRD)
2. Przeglądarka i wersja
3. Kroki do reprodukcji
4. Oczekiwany vs faktyczny rezultat
5. Screenshot/nagranie ekranu
6. Konsola przeglądarki (F12 → Console)

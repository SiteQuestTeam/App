# Weryfikacja — 4 października 2026

## Stan bazowy

- `main`: `2d97fa142a2f55f2bae3d9dd85356a53fbd742b9`.
- Źródłowy `landing-page`: `5b773210b94a8a7ee5e1a710ae54439e088f24c6`.
- Oba commity są przodkami `landing-page-final`; żadnego resetu ani force push.
- `git diff origin/main -- . ':!landing-page'` jest pusty. Cała implementacja i materiały przeglądowe mieszczą się w `landing-page/`.
- Zastane pliki `dist` usunięto z indeksu Git; build jest teraz generowany z kodu, zamiast przechowywać przestarzały bundle. Oryginalne ilustracje oraz Beaver3D pozostały w repo.

## Wyniki

| Kontrola | Wynik |
|---|---|
| `npm run build` | PASS — Vite 8.3.2 |
| `npm run format:check` | PASS |
| `npm test`, Chromium 134, 360 px | PASS |
| `npm test`, Chromium 134, 768 px | PASS |
| `npm test`, Chromium 134, 1440 px | PASS |
| CTA, wybór inicjatywy, głos 9/10 → 10/10, blokada drugiego głosu, reset | PASS |
| Ścieżka usterek i powrót do inicjatyw | PASS — nic nie jest wysyłane |
| Menu mobilne, Escape, kotwice, fokus po zamknięciu dialogu, Tab | PASS |
| Obrazy, odpowiedzi HTTP, konsola landingu | PASS — brak błędów |
| Przepełnienia poziome, cele min. 44×44 px, reduced motion | PASS |
| axe: WCAG 2 A/AA i 2.1 AA, landing + dialog | 0 wykrytych naruszeń przy każdej szerokości |
| Oględziny zrzutów desktop/tablet/mobile | PASS po poprawkach układu i odsunięciu dymka od twarzy bobra |
| `npx tsc --noEmit` w głównej aplikacji | 16 zastanych błędów TypeScript; kod aplikacji jest identyczny z main |

Wizualnie sprawdzono `landing-1440.png`, `landing-768.png`, `landing-360.png`, widoki hero oraz dialog. Zrzuty pochodzą z lokalnego produkcyjnego buildu landingu. Ekran telefonu został odświeżony po ostatnim merge main — to rzeczywisty ekran szczegółów aplikacji.

## Zakres i ograniczenia

- Automatyczna kontrola axe nie jest pełnym audytem dostępności; nie wykonano testu czytnikiem ekranu ani Safari/Firefox.
- Nie wykonano testów sprzętowych iOS/Android, aparatu ani GPS. Expo Web uruchomiono do zrzutu ekranu; zewnętrzny skrypt mapy nie załadował się w środowisku testowym. To ograniczenie podglądu aplikacji, nie błąd landingu.
- Demo inicjatyw jest lokalną symulacją, bez trwałości, kont, API, AI i KCK. Próg nie oznacza realizacji. Brak deklaracji prawdziwych partnerów, nagród i statystyk użycia.
- Główne CTA domyślnie otwiera lokalne demo. Zewnętrzny adres ustawia się przez `VITE_APP_URL` dopiero po jego weryfikacji.
- Token Signal Blue: `#2F6BFF`. Małe przyciski z białym tekstem: `#2F6AFF`, minimalna korekta dla kontrastu ≥4,5:1. Hover i active: `#1746B7`.
- JavaScript produkcyjny: ok. 249 KB / 79 KB gzip; bez Three.js/WebGL. Trzy grafiki maskotki: ok. 190 KB. Screenshot aplikacji: ok. 56 KB. Fonty lokalne; przeglądarka pobiera odpowiednie podzbiory znaków.
- Brak merge do main i brak publikacji produkcyjnej.

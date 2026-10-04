# SiteQuest — landing page

Samodzielny React + Vite, rozwijany z istniejącego `landing-page/`. Nie jest to stary ekran Expo `src/screens/LandingScreen.tsx`.

## Uruchomienie

Wymagany Node.js 22.12+ (sprawdzono na 24.19).

```sh
cd landing-page
npm ci
npm run dev
```

Strona: http://127.0.0.1:5173. Podgląd buildu:

```sh
npm run build
npm run preview
```

Podgląd: http://127.0.0.1:4173. Do udostępnienia w sieci lokalnej dopisz `-- --host 0.0.0.0`. Konfiguracja `base: './'` pozwala też serwować build z podkatalogu. Nie ma wdrożenia produkcyjnego w tej zmianie.

## CTA i zakres demonstracji

Jedynym miejscem konfiguracji adresu jest `src/config.js`, czytające `VITE_APP_URL`. Domyślnie brak zewnętrznego adresu: wszystkie główne CTA otwierają działający lokalny podgląd w natywnym dialogu. Nie wymagają osobnego serwera Expo, konta, GPS ani aparatu.

Po osobnej weryfikacji docelowego adresu można ustawić go na etapie buildu:

```sh
VITE_APP_URL=https://zweryfikowany-adres-aplikacji.example npm run build
```

Powyższa domena jest wyłącznie przykładem konfiguracji. Nigdy nie jest używana przez domyślny build. Akceptowane są adresy HTTPS bez danych logowania; adresy localhost są odrzucane na rzecz demo. Zmienna nie jest sekretem.

Podgląd importuje przykłady bezpośrednio z `../src/data.ts`. Umożliwia wybór 3 inicjatyw, czytanie opisu, oddanie jednego lokalnego głosu na inicjatywę, przejście 9/10 → 10/10, reset i poznanie osobnej ścieżki usterek. Zamknięcie dialogu usuwa stan. Nie publikuje inicjatyw, nie wysyła usterek, nie łączy się z AI, nie przyznaje prawdziwych punktów ani nagród. Próg głosów nie oznacza realizacji.

## Źródła i stan produktu

Zweryfikowano 4 października 2026:

- App `main`: `2d97fa142a2f55f2bae3d9dd85356a53fbd742b9` (odświeżono przed przekazaniem).
- Dotychczasowy `landing-page`: `5b773210b94a8a7ee5e1a710ae54439e088f24c6`.
- Project-context-: `80bf65f3beaec5203e7e784e485a41bfceb9b4ed` — `MVP.md`, `CONTEXT.md`, ADR 0010, wytyczne integracji KCK.
- Nowa gałąź `landing-page-final` powstała z istniejącego landingu; połączenie z main jest zwykłym merge, zachowującym obie historie. Kod Expo i konfiguracja są identyczne z powyższym main.
- W App stan inicjatyw, punkty i głosy są lokalne; kreator korzysta z `mockAiQuestions`. `IncidentScreen` nie otrzymuje `onSubmit` w `App.tsx`, więc prawdziwa wysyłka nie jest podłączona.
- Dokumentacja nazywa produkt jeszcze SideQuest, ale na stronie zgodnie z zadaniem obowiązuje SiteQuest. Imię bobra nie jest rozstrzygnięte w bieżących dokumentach: użyto „bóbr SiteQuest”. Zwiad/Misja/Rajd i gildie nie stanowią głównego przekazu.
- Workflow tworzy obraz web, ale repo nie zawiera zweryfikowanego publicznego URL. Stąd domyślne lokalne demo.

## Grafiki

`public/assets/beaver-{wave,think,point}.webp` to oryginalne osadzone obrazy z dostarczonego PDF „SiteQuest HackYeah 2026”: odpowiednio strony 5, 4, 8 (obiekty PDF 96, 86, 182). Zachowano maski alfa, postać, strój i proporcje; jedyna konwersja to WebP. Łącznie około 190 KB. Nie generowano nowej postaci.

`app-detail.webp` to rzeczywisty screenshot aplikacji z main, ekran inicjatywy „Stoisko z gorącą herbatą…”, 390×844 CSS px / DPR 2, wykonany na lokalnym Expo Web. Schemat mapy w sekcji aplikacji jest opisany jako demonstracyjny, nie jest zrzutem mapy GPS.

Starsze grafiki i `Beaver3D.jsx` zachowano jako materiały zastane. Nie są importowane przez stronę; Three.js nie trafia do jej bundla. Logo na stronie pochodzi z sygnetu w dostarczonym Urban Signal. Fonty Manrope i Inter są lokalnymi paczkami Fontsource, z obsługą polskich znaków.

## Kontrole

```sh
npm run build
npx playwright install chromium
npm test
npm run format:check
```

Testy uruchamiają lokalny podgląd produkcyjnego buildu i sprawdzają szerokości 360/768/1440 px, CTA, kotwice, menu, Escape/fokus, symulację głosów, reset, ścieżkę usterek, ładowanie obrazów, przepełnienia, min. 44 px celu, reduced motion, konsolę i axe WCAG A/AA. Zrzuty są w `review/`. Szczegółowy wynik w `review/VERIFICATION.md`.

Aplikacja Expo ma zastane błędy `tsc --noEmit` na main (16 diagnostyk dotyczących m.in. wymaganych propsów i nieaktualnego LandingScreen). Landing nie zmienia jej kodu. Podczas podglądu Expo zewnętrzne skrypty mapy były niedostępne w środowisku testowym; ekran szczegółów działał. Nie wykonano testów na fizycznym Androidzie/iOS, integracji KCK ani produkcyjnego backendu.

### Kontrast przycisków

Token Signal Blue pozostaje `#2F6BFF`. Biel na nim ma rzeczywisty kontrast ok. 4,496:1, mimo zaokrąglenia do 4,50 w guideline. Tło małych CTA używa minimalnie skorygowanego `#2F6AFF`, aby spełnić 4,5:1. Hover/active: Deep Blue. Pomocniczy tekst na jasnoniebieskiej powierzchni ma ciemniejszy odcień.

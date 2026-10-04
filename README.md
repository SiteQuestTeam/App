# SiteQuest App

Mobilny frontend MVP SiteQuest zbudowany w Expo / React Native i TypeScript.

## Aktualny mock MVP

Aplikacja implementuje lokalnie pełną ścieżkę demonstracyjną z aktualnego `Project-context-`:

- logowanie wyłącznie pseudonimem, bez hasła,
- mapa MapLibre / OpenStreetMap z Awatarem bobra w pozycji GPS,
- wizualny promień około 50 m wokół Awatara,
- pinezki Inicjatyw ze statusem `Zbiera głosy` / `Przeszła`,
- demo HackYeah: „Stoisko z gorącą herbatą na HackYeah 2026” przy TAURON Arenie z 9/10 Głosami,
- ekran szczegółów z pełnym Briefem i Progiem,
- Głos możliwy na miejscu; demo herbaty pozwala pokazać przejście 9/10 → 10/10,
- Punkty, Ranga i Nagrody,
- Zdjęcie na żywo wyłącznie aparatem aplikacji,
- mock rozmowy AI z maksymalnie 3 pytaniami,
- edytowalny Brief przed publikacją,
- dwa pytania tak/nie ustalające „Kto naprawi”,
- publikacja nowej Inicjatywy z lokalnym stanem i pozycją GPS.

Backend nie jest jeszcze wymagany do przejścia demo. Stan, Punkty, Głosy, AI i Nagrody są mockowane lokalnie. Docelowo reguły Punktów, Głosów, progu 50 m i wydawania Nagród muszą być liczone i walidowane przez backend.

## Stack

- Expo 57
- React Native
- TypeScript
- expo-location
- expo-camera
- react-native-webview
- MapLibre GL + OpenFreeMap / OpenStreetMap
- Three.js wewnątrz widoku mapy

## Uruchomienie

```powershell
git clone https://github.com/SiteQuestTeam/App.git
cd App
npm.cmd ci
npm.cmd start
```

Na Androidzie można użyć Expo Go albo lokalnego builda:

```powershell
npm.cmd run android -- --localhost
```

## Weryfikacja

```powershell
npx.cmd tsc --noEmit
npx.cmd expo install --check
```

Po zmianach MVP wymagany jest jeszcze smoke test na fizycznym urządzeniu/emulatorze: aparat, GPS, WebView/Three.js, głosowanie i pełna ścieżka Zdjęcie → AI → Brief → publikacja.

# SiteQuest App

Klikalny frontend aplikacji mobilnej SiteQuest zbudowany w Expo / React Native.

## Frontend MVP

- landing page zgodny z identyfikacją „Urban Signal”,
- mapa MapLibre oparta na danych OpenStreetMap, z perspektywą 3D,
- awatar gracza, promień interakcji, GPS i ręczne przemieszczanie po mapie,
- przykładowe inicjatywy, szczegóły i dołączanie do ekipy,
- trzyetapowy kreator inicjatywy,
- widoki Odkrywaj, Ekipa, Profil i Panel NGO,
- demonstracyjne przełączanie roli Gracz / NGO bez logowania,
- aparat do wykonywania Zdjęć na żywo.

Mapa pobiera styl i kafelki przez internet. Pozostałe ekrany używają lokalnych danych demonstracyjnych i nie wymagają backendu.

## Local setup on Windows

Requirements: Node.js 22.20.0 or compatible supported LTS, npm, Android Studio
with Android SDK, platform-tools, emulator and an Android system image.
Android Studio's bundled JDK can be used as JAVA_HOME.

```powershell
git clone https://github.com/SiteQuestTeam/App.git
cd App
npm.cmd ci
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:NODE_OPTIONS = '--dns-result-order=ipv4first'
npm.cmd run android -- --localhost
```

Start an Android virtual device in Android Studio's Device Manager first.
The local test device is SiteQuest_API36 (Pixel 7, API 36, Google APIs x86_64).
Expo CLI installs Expo Go on the emulator and starts Metro on port 8081.
For a physical Android device, use `npm.cmd start` and scan the QR code in
Expo Go; the computer and device must be on the same network.

For a USB-connected Android device with USB debugging enabled and Expo Go
installed, start Metro in one terminal:

```powershell
$env:NODE_OPTIONS = '--dns-result-order=ipv4first'
npm.cmd start -- --localhost --port 8082
```

Then open the app in another terminal:

```powershell
$sitequestAdb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $sitequestAdb reverse tcp:8082 tcp:8082
& $sitequestAdb shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8082
```

If multiple Android devices are connected, add `-s DEVICE_SERIAL` before
each adb command. Keep Metro running while using the app.

Use `npm.cmd` and `npx.cmd` if PowerShell blocks npm.ps1 scripts.
These environment variables apply to the current terminal session.

## Verification

```powershell
npx.cmd expo install --check
```

Confirm that Hello World is visible on the emulator without a runtime error.
This workflow runs JavaScript in Expo Go; it does not verify a standalone APK
or an iOS build. The iOS simulator requires macOS and Xcode.

Pending dependency work is documented in `SETUP-ISSUES.md`.

Verified on 2026-10-03 on a physical Samsung SM-A566B through USB and Expo Go.
Hello World was visible in both the Android UI hierarchy and a screenshot;
the sampled ReactNativeJS / AndroidRuntime error log was empty. Metro is
available at http://127.0.0.1:8082. The offline dependency check passed using
Expo's bundled version data; it did not validate against the online registry.

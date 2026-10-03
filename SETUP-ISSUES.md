# Local setup issues

## Pending task: Review npm dependency vulnerabilities

Observation: npm audit after the initial dependency installation reports
23 affected packages: 16 high, 7 moderate, 0 critical.
Affected dependency chains include Expo CLI / Metro, node-forge and xcode / uuid.

Reproduce: run `npm.cmd ci`, then `npm.cmd audit`.

Work: review advisory applicability to development and production, select
compatible dependency fixes, and repeat the Android smoke test. Do not apply
`npm audit fix --force` blindly: the current audit suggests downgrading Expo
to 44.0.6 and React Native to 0.72.17, which changes the project SDK.

Acceptance: actionable advisories are fixed or explicitly documented with
their scope and rationale; the basic screen still runs on Android.

Trello status: task not created; Trello integration must be installed and
connected, and the destination board/list selected.

## Resolved during setup

- PowerShell blocked npm.ps1: use npm.cmd / npx.cmd.
- Sandbox blocked npm registry access: dependency download required approval.
- Android SDK was installed but absent from PATH: use ANDROID_HOME.
- No Android virtual device existed: created SiteQuest_API36 using the
  installed API 36 Google APIs image and Android Studio's bundled JDK.
- Expo requested React Native 0.86.3 instead of 0.86.0: aligned package.json.
- Expo Go initially failed to download the local update while Metro listened
  on IPv6 localhost. The working setup uses an IPv4-capable Metro listener
  and adb reverse on port 8082; the README documents NODE_OPTIONS and USB steps.

## Smoke test result: 2026-10-03

Passed on physical Samsung SM-A566B using Expo Go over USB. Hello World was
visible in the Android UI hierarchy and the captured screen. Metro returned
packager-status:running; the sampled ReactNativeJS / AndroidRuntime error
log contained no entries. The configured emulator was not the final test
target. Standalone Android and iOS builds were not tested.

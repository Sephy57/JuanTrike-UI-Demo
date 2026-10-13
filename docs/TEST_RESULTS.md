# JuanTrike UI Demo — Test Results

Environment: Windows 11, Node 24.21.0, Expo SDK 57 (expo ~57.0.28, react-native 0.86.3), Android emulator `JuanTrike_API36_X86_64` (API 36, x86_64), Expo Go 57.0.9.

## Summary

| Check | Status | Evidence |
|---|---|---|
| TypeScript (`npx tsc --noEmit`) | PASS | Clean run after final edits |
| Unit tests (Jest + jest-expo, 2 suites, 16 tests) | PASS | `__tests__/bookingMachine.test.ts`, `__tests__/geo.test.ts` |
| Android JS bundle (`expo export --platform android`) | PASS | 620 modules, exit 0 (before later UI edits) |
| Dev bundle loaded in Expo Go on emulator | PASS | Metro log: `Android Bundled 13305ms index.ts (748 modules)` |
| Welcome screen renders | PASS | `docs/screenshots/01-welcome.png` |
| Passenger Mode | PASS | `03-passenger-home.png` |
| Interactive map — real OSM tiles | PASS | `03-passenger-home.png`, `06-destination-selected.png` (Angeles City street names visible) |
| Map tap sets pickup and destination | PASS | `06-destination-selected.png` |
| Map pan / zoom | PASS | `map-pan.png`, `map-zoom-out.png` |
| Map loading / error states | PARTIAL | Loading overlay shown until tiles report ready; error state implemented but not exercised (no offline test) |
| Foreground GPS (permission, fix, marker) | PASS (emulator-simulated) | `05-gps-permission.png`, `06-gps-marker.png` — labelled "Emulator-simulated location", 15.17142, 120.54017, ±100 m |
| Booking review, confirm, searching | PASS | `07-review-booking.png`, `08-searching.png`, `09-searching-example.png` |
| Automatic search → driver offered | PASS | `09b-driver-offered-example.png` |
| Driver Mode dashboard | PASS | `10-driver-dashboard.png` |
| Incoming DEMO booking + Accept | PASS | `11-incoming-booking.png`, `12-driver-accepted.png` |
| Driver progression (en route → arrived → start → complete) | PASS | `13`–`16-trip-completed-driver.png` |
| Shared booking state across modes | PASS | `17-passenger-completed.png` shows the driver's completed trip and DEMO fare |
| Local trip history | PASS | `18-trip-history.png` |
| New booking reset | PASS | `21-new-booking.png` |
| Demo control panel | PASS | `demo-panel.png`, `panel-scrolled.png`; example booking triggered from the panel |
| English / Filipino switching | PASS | `16-filipino-passenger.png` |
| Demo reset | PASS (unit) / NOT exercised on device | `RESET` covered by unit test; panel button not tapped on device |
| Driver offline gating | NOT exercised on device | Implemented; no screenshot |
| Maestro UI smoke test | BLOCKED | See below |
| Expo dependency check (`expo install --check`) | NOT RUN | Metro reported "1 package may need updating" |
| Lint | NOT RUN | No ESLint config in this project |
| Native Android APK build (`expo run:android`) | FAILED | See below |

## Blockers and failures

### 1. Maestro smoke test — BLOCKED (disk space)
`maestro/passenger-smoke.yaml` reaches Passenger Mode on the emulator, then Maestro fails to install its driver APK with `There is not enough space on the disk`. Drive C has 0 GB free, and Maestro writes to C during install. The test was not run to completion, so no UI smoke PASS is claimed.
Remaining space is mostly caches on C: `.gradle` ~3.5 GB, `npm-cache` ~2.5 GB, `AppData\Local\Temp` ~2.7 GB. Nothing was deleted without permission.
Log: `docs/logs/passenger-smoke.log`.

### 2. Native debug APK — FAILED
`./gradlew assembleDebug` (JDK 25 from Android Studio) fails in `:expo-modules-core:configureCMakeDebug[arm64-v8a]` and `[x86_64]`. The CMake prefab step exits 0, then Gradle reports `WARNING: A restricted method in java.lang.System has been called` as a task failure. Adding `--enable-native-access=ALL-UNNAMED` did not fix it. Not investigated further.
Workaround used: Expo Go, which needs no native build. Logs: `docs/logs/build-android.log`, `cmake-debug*.log`.
The generated `android/` folder is a failed prebuild and is not used by the Expo Go run path.

## Issues found during device testing (fixed)
- "Driver Mode" header button was clipped, so it was made compact.
- Top map chip showed "Trip started" while searching. Now shows "Booking in progress — map locked".
- Chip stayed on "set pickup" after pickup was set. Now follows the current selection.
- First map screenshot showed "Loading map…" because it was captured before tiles loaded. Re-test showed tiles ready and no error.

## Known gaps
- Map does not re-centre on the demo pickup when the example booking is triggered.
- Leaflet is loaded from cdnjs with SRI hashes (computed from the live files). OpenStreetMap tile usage is demo-level only, per the OSM tile usage policy.
- Driver-offline gating and the demo reset button are not exercised on the emulator.
- The official JuanTrike logo was not found in the related project's asset folders. The app shows a plain-text wordmark. The launcher icon is still the Expo default. The logo asset must be supplied.

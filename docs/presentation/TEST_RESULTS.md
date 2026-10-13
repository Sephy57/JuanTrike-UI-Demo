# JuanTrike UI Demo — Test Results

**Overall status: see §7. The full positive flow and one unsuccessful driver-matching scenario were completed on the Android emulator, with real touch input and real screenshots.**

Automated checks, device runs, and the defects found along the way are recorded below. Anything not run on the device is listed as NOT VERIFIED.

Run date: 2026-10-13. Host: Windows 11, AMD Ryzen 5 5500GT (6 cores / 12 threads), 15.3 GB RAM. Emulator: `JuanTrike_API36_X86_64` (Android 36, x86_64). Expo SDK 57, React Native 0.86.3.

## 1. Automated checks (all run in this session)

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | PASS (exit 0) |
| Lint | `npx eslint src __tests__ App.tsx` | PASS (exit 0) |
| Unit and state-machine tests | `npx jest` | PASS — 5 suites, **55 tests** (final rerun) |
| Android JS export | `npx expo export --platform android` | PASS — 623 modules |
| Android debug build | `./gradlew assembleDebug` | PASS (earlier in session) — `BUILD SUCCESSFUL in 7m 10s` |

### Test breakdown

| Suite | Tests | Covers |
|---|---|---|
| `bookingMachine.test.ts` | existing | Location selection, full trip, decline, cancel, reset |
| `dispatch.test.ts` | 17 | Geofence membership, FIFO offers, decline/expiry escalation, no-driver cancel, one-driver rule, movement helpers, cash on completion |
| `demoContext.test.tsx` | 13 | Deterministic clock with fake timers: request → search → offer, pause/resume, booking confirmed while paused held until resume, pause during search, accept while paused, decline, expiry, three attempts, full accepted trip, cancellation stops movement, speed, outside-coverage refusal, reset during offer, reset after completed trip |
| `geo.test.ts`, `gpsFix.test.ts` | existing | Distance, fare, GPS fix handling |

## 2. Defect found and fixed in this session

**Offer and search timing was not on the simulated clock.** The request (0.6 s) and search (2 s) steps used `setTimeout` in a React effect. The countdown and movement used the tick clock. Two consequences:

- Pause did not stop the search, and the offer could arrive a few hundred milliseconds later than the countdown assumed.
- Timing depended on React's effect-flush order, so offers could not be tested deterministically.

**Fix.** The request and search delays now run on the same tick clock as the offer countdown, approach and trip (`src/booking/bookingMachine.ts`, `src/booking/DemoContext.tsx`). Pause, resume and speed now apply to every timed step. Tests written against fake timers confirmed the behavior and caught the issue.

**Answer to the question "is this a state defect?"** The reducer reads the offer from state at dispatch time, so there was no stale closure. Accept and decline worked when the state was reached. The "expires before tapping" problem was real timing (a 20-second window in real time) on a slow emulator. Pausing the simulation is the presenter fix, now supported and tested.

## 3. Device checks (Android emulator)

Earlier run (software GPU, 2 cores, before the clock change):

| Step | Result | Evidence |
|---|---|---|
| App installs and launches | PASS | `01-welcome.png` |
| Welcome, Passenger/Driver choice | PASS | `01-welcome.png` |
| Angeles City map with OSM tiles | PASS | `02-passenger-pickup-coverage-route.png` |
| Synthetic TODA-A zone drawn and labelled | PASS (after fix) | `02` |
| Pickup set on map; coverage check | PASS | `02` — "Inside synthetic coverage: SYNTHETIC TODA A" |
| Destination set; simulated route | PASS | `02` |
| Confirm booking; map locked | PASS | `03-booking-confirmed-map-locked.png` |
| Offer countdown | PASS | `04-searching-offer-1-of-3.png` |
| Offer expiry escalates to next driver | PASS | `05-offer-expired-escalated-offer-2-of-3.png` |
| Driver dashboard and FIFO queue | PASS | `06-driver-dashboard-fifo-queue.png` |
| Incoming offer card (distance, DEMO fare, Accept/Decline) | PASS | `07-driver-incoming-offer.png` |
| Escalation ends with no-driver cancellation | PASS | `08-trip-cancelled-no-driver.png` |
| Demo control panel opens | PASS | `09-demo-control-panel.png` |

### Positive booking run on the device (final, 10:05–10:13)

Run after closing RobloxPlayerBeta and freeing RAM (3.8 GB free), with a cleared Metro cache and cleared app data for a known start. Real touch input throughout; each step is a captured screenshot.

| Step | Result | Screenshot |
|---|---|---|
| Passenger pickup and destination inside SYNTHETIC TODA A | PASS | `10` |
| Booking confirmed while simulation paused; held at request step | PASS | `11` |
| Simulation resumed; offer 1 of 3 appears with countdown | PASS | `25` |
| Panel pause/resume (label changes Pause ↔ Resume) | PASS | `23` |
| Driver dashboard and FIFO queue | PASS | `06` |
| Driver incoming offer with distance and DEMO fare | PASS | `12` |
| Driver accepts (driver side shows "on the way") | PASS | `13` |
| Passenger side shows the assignment after accept | NOT VERIFIED — the passenger view after accept was not captured in this run | — |
| Navigation to pickup: ETA and remaining distance fall with movement | PASS | `14` |
| Driver arrives; Start trip available | PASS | `15` |
| Trip starts; vehicle marker moves along the simulated route | PASS | `16`, `17` |
| Trip completes automatically at destination | PASS | `18` |
| Cash recorded as DEMO collected (not real money) | PASS | `18` |
| Return to queue clears the active booking | PASS | `19` |
| Trip history shows the completed trip | PASS | `20` |

### Unsuccessful driver-matching run on the device

| Step | Result | Screenshot |
|---|---|---|
| Offer 1 (Mang Ben) expires without response | PASS | `21` (offer 2 of 3 after escalation) |
| Offer 2 (Mang Joel) expires; no third eligible driver | PASS | `22` |
| Booking ends as cancelled with reason "No eligible driver accepted" | PASS | `22` |

Two timing notes from the device run:
- Offers expired on the device because the presenter paused a few seconds late. That is the intended behaviour of the 20-second window; pausing before the offer appears is the presenter control.
- The app ran at 1x and then 2x speed at different points. The steps above were checked at whatever speed was active, and the timers behaved as expected.

### Panel controls and reset on the device

| Control | Result | Evidence |
|---|---|---|
| Pause / Resume | PASS | `23`, and offer countdown held at 7 s while paused |
| Speed (1x / 2x / 4x) | PASS | Label cycles; 2x and 4x set and reset to 1x |
| Simulate offer expiry | PASS (exercised via real expiry) | `21` |
| Simulate driver decline | NOT VERIFIED on device | Logic covered by `demoContext.test.tsx` |
| Reset demo | PASS | `24`: "No DEMO trips yet", map back to starting view |

### Still not verified on the device

| Item | Status |
|---|---|
| Passenger-side view after driver accept (assignment, approach status) | NOT VERIFIED on device |
| Passenger-side trip history after completion | NOT VERIFIED on device (driver-side history was checked) |
| Reset during an active booking | NOT VERIFIED on device (reset after a completed trip was checked) |
| Outside-coverage booking (confirm disabled) on device | NOT VERIFIED; logic covered by `demoContext.test.tsx` |
| Simulate driver decline on device | NOT VERIFIED; logic covered by tests |
| Offline map fallback | NOT VERIFIED; implemented, not tested with networking off |
| Repeatability across several full runs | NOT VERIFIED beyond the two runs above |

## 4. Emulator and environment findings

- **Host load.** During the earlier runs, background processes used substantial CPU and memory: a game client (`RobloxPlayerBeta`), several Chrome windows, Task Manager, and VS Code. Free RAM dropped to 0.59 GB at one point. The emulator reported "JuanTrike isn't responding" repeatedly, and the input dispatcher logged 5-second timeouts on taps. For the final run, RobloxPlayerBeta and its crash handler were closed (you authorized it; neither had a main window or unsaved work). Chrome helper processes had no visible windows and were left running. Free RAM rose to 3.8 GB, and input latency measured about 176 ms.
- **Stale JavaScript bundle on the device.** After edits, the app repeatedly ran an older bundle even though Metro served the current code. `adb shell pm clear com.juantrike.uidemo` and a Metro restart with `--clear` resolved it each time. This is an environment and caching issue, not an application defect.
- **AVD configuration changed for this session** (existing AVD only; the previous file is backed up at `D:\juantrike-build-logs\config.ini.bak`):
  - CPU cores 2 → 4
  - GPU mode `auto` → `host`
  - device frame off, audio input off
  - RAM unchanged at 2048 MB
  Result: the ANR and input lag continued while host load was high. These settings alone did not fix responsiveness.
- **Map on the emulator.** Leaflet and OSM tiles load slowly on this host. The map area showed "Loading map…" for several seconds, and the WebView sometimes stalled the UI thread.

## 5. Defects found and fixed during device testing (earlier)

1. Zone polygons were cleared on every state update. Fixed by giving zones their own layer.
2. Blank map from a stale bundle (environment; see §4).
3. Page script errors were not visible. Added `window.onerror` forwarding to the app log (dev-only warning).
4. Lint error in `DemoContext` (ref assignment during render). Moved into an effect.

## 6. Verification of the required scenarios

| Scenario | Automated (Jest) | Android device |
|---|---|---|
| Positive booking through trip completion, cash, history, return to queue | PASS | PASS (driver side; see §3) |
| Booking outside coverage (confirm disabled) | PASS | NOT VERIFIED on device |
| Driver declines | PASS | NOT VERIFIED on device |
| Offer expires and escalates | PASS | PASS (offer 1 → offer 2 of 3) |
| Three unsuccessful attempts / no eligible driver | PASS | PASS (cancelled, "No eligible driver accepted") |
| Booking cancelled | PASS | NOT VERIFIED on device |
| GPS simulation paused and resumed | PASS | PASS (countdown held while paused; movement resumed) |
| Reset during active booking | PASS | NOT VERIFIED on device |
| Reset after completed trip | PASS | PASS ("No DEMO trips yet") |
| Missing tiles / offline fallback | Not automated | NOT VERIFIED — implemented, not tested with networking off |

## 7. Presentation acceptance

Verdict: **not marked PRESENTATION_READY.** The target asked for one successful complete Android demo and one verified unsuccessful-driver-matching scenario; both were completed and are evidenced above. Two acceptance criteria are still open:

| Criterion | Status |
|---|---|
| Passenger workflow passes | PARTIAL — booking, offer and expiry seen on the passenger screen; the passenger view after driver accept, and passenger history, were not captured |
| Driver workflow passes | PASS — dashboard, FIFO queue, offer, accept, approach, arrival, trip, completion, return to queue, history |
| Driver acceptance works | PASS (device, driver side) |
| Simulated GPS movement works | PASS (device) — approach and trip, pause/resume |
| Trip completion works | PASS (device) |
| Cash simulation works | PASS (device) — shown as DEMO, not real money |
| Demo reset works | PASS (device, after a completed trip) |
| Negative scenarios work | PASS (device) for expiry and no-eligible-driver; decline and outside-coverage not run on device |
| Android build passes | PASS |
| Real screenshots exist | PASS — 25 captures in `docs/presentation/screenshots/`, indexed in the gallery |
| Documentation complete | Written: overview, passenger, driver, GPS/geofencing, scenarios, runbook, gallery, test results |
| Full demonstration repeatable reliably | NOT VERIFIED — two device runs in this session; repeatability not yet shown |

**Remaining blockers to PRESENTATION_READY:**
1. Capture the passenger view after driver accept (assignment and approach status) and the passenger trip history. Both are passenger-side acceptance items.
2. Show repeatability: a second clean full run from reset, with the same screenshots.

Both are device work and need the emulator to process taps reliably. The host load that caused earlier freezes was reduced (Roblox closed, 3.8 GB free), and taps were responsive for the final run.

## 8. Architecture note

`AGENTS.md` asks for Expo Router under `src/app/`. This POC keeps the existing state-based navigation in `App.tsx`, as directed for this presentation. This is a temporary deviation and is recorded in `JUANTRIKE_POC_OVERVIEW.md`.

## 9. Reproduce

```powershell
cd D:\JUANTRIKE-UI-DEMO
npx tsc --noEmit
npx eslint src __tests__ App.tsx
npx jest
cd android; .\gradlew.bat assembleDebug; cd ..
$env:CI=1; npx expo start --dev-client --port 8081 --clear
adb reverse tcp:8081 tcp:8081
adb shell pm clear com.juantrike.uidemo
```

## 10. Final acceptance run (10:16–10:21, same session)

Fresh start: app data cleared, Metro running on port 8081, emulator `emulator-5554`. Real touch input; each step is a captured screenshot in `screenshots/`.

### Passed on the device

| Step | Result | Screenshot |
|---|---|---|
| Reset to a fresh start, Passenger Mode | PASS | `final-01`/`02` (not copied) |
| Pickup and destination inside SYNTHETIC TODA A; coverage line shown | PASS | `26` |
| DEMO fare, DEMO-only note, Cash selected, GCash/Maya "Not in demo" | PASS | `final-06` (not copied) |
| Pause before confirming; booking confirmed; request held while paused | PASS | `28` |
| Driver Mode: FIFO queue shows Mang Ben eligible, Mang Rudy outside TODA | PASS | `final-13` (not copied) |
| Incoming offer with countdown, distance, DEMO fare, Decline/Accept | PASS | `final-22` (not copied) |
| Driver accepts; driver card shows "on the way" | PASS | `29` |
| Passenger status card names the assigned driver, TODA and body number | PASS | `31` |
| Approach: ETA and remaining distance decrease (≈20 s → 16 s → 5 s; 596 m → 462 m → 142 m) | PASS | `32`, `final-31`, `final-33` |
| Driver arrives automatically; Start trip available | PASS | `final-34` (not copied) |
| Trip starts; vehicle moves along the simulated route (489 m → 334 m → 265 m → 188 m → 118 m → 45 m) | PASS | `33`, `34` |
| Trip completes at destination; "Cash collected (DEMO, not real money)" | PASS | `35` |
| Driver trip history: one "Trip completed" entry, 0.47 km, DEMO ₱26 | PASS | `36` |
| Demo panel pause/resume, speed cycling (1x/2x/4x) | PASS | `final-08`, `final-20` (not copied) |

### Not completed on the device

| Item | Status |
|---|---|
| Passenger trip history after completion | NOT VERIFIED — the mode-switch taps were lost or applied late, so I could not reach it reliably |
| Passenger-side status during the approach (screenshot captured after arrival) | NOT CAPTURED cleanly |
| Driver manually declines an offer | NOT RUN on the device |
| Passenger attempts an outside-coverage booking on the device | NOT RUN on the device (covered by `demoContext.test.tsx`) |
| Demo reset during an active booking | NOT RUN on the device |
| Offline map fallback | NOT RUN (implemented, not tested with networking off) |
| Full repeat of the positive run from reset (repeatability, no stale timers) | NOT COMPLETED — only one full positive run completed in this session |

### Defect found and fixed during this run

- The passenger status card read "TODA TODA-A" because the label and the zone ID both said TODA. It now reads "Mang Ben · TODA-A · Body no. AB-014". Fixed in `src/screens/PassengerScreen.tsx`. Typecheck, lint and tests pass after the change; the corrected text was not captured on the device.

### Automated checks (final)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS (exit 0) |
| `npx eslint src __tests__ App.tsx` | PASS (exit 0) |
| `npx jest` | PASS — 5 suites, 55 tests |

## 11. Verdict

**Not PRESENTATION_READY.** The positive driver-side flow, the passenger's view of the assignment, the approach movement, the trip, the DEMO cash, and the driver history were all verified on the emulator. The mandatory items still open are:

1. Passenger trip history after completion (device).
2. A repeat of the full positive run from reset, to show repeatability and no stale timers or duplicate trips.
3. Negative scenarios on the device: manual decline, outside-coverage booking, reset during an active booking. The offline fallback is also untested.

The emulator's input handling is the blocker for these. Mode switches and panel taps were often lost or applied late, which made the passenger-side steps unreliable in this session.

## 8. Recovery session (2026-10-13, evening)

**Verdict: PARTIAL.** Not PRESENTATION_READY. Offline map fallback and the presentation docs (runbook, gallery) are not complete.

### Automated gates (final, this session)

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | PASS (exit 0) |
| Lint | `npx eslint src __tests__ App.tsx` | PASS (exit 0) |
| Jest | `npx jest` | PASS — 5 suites, **63 tests** |

New tests this session: 5 role-switch tests (`switchMode` guard, repeated and delayed taps, alternating switches, trip preserved across switches) and 3 clock regression tests (second booking after cancel, no stale offer after cancel, large timing gap).

### Clock diagnosis

- Earlier reports of a "stuck" booking were **not a clock defect**. Development-only `[clock]` logs (since removed) recorded the reducer moving BOOKING_REQUESTED → SEARCHING_DRIVER → DRIVER_OFFERED within about 3 s of confirmation, with ticks at about 250 ms.
- The passenger banner "Booking in progress — map locked" is shown for the whole active booking, including the offer stage, so it looked stuck.
- The driver offer card was rendered below the FIFO queue, and the UI dump and Maestro scroll could not see it reliably.
- Fix: moved the offer (with accept and decline), the active-trip card, the completion card, and the history toggle to the top of the driver sheet. No state logic changed.

### Android device runs (emulator-5554, dev build, Metro)

| Workflow | Method | Result | Evidence |
|---|---|---|---|
| Positive run 1 (full) | Maestro `positive-run.yaml`, RUN=run1 | PASS, 40/40 steps | `docs/presentation/screenshots/device/run1-*.png` |
| Positive run 2 (from clean state) | Maestro, RUN=run2 | PASS, 40/40 steps | `docs/presentation/screenshots/device/run2-*.png` |
| Scenario A — driver declines | Maestro `negative-decline.yaml` | PASS | `neg-decline-*.png` |
| Scenario C — outside coverage denied | Manual adb + screenshot | PASS (behaviour verified) | `manual-neg-outside-coverage-denied.png` |
| Scenario D — reset during active booking | Maestro `negative-reset-active.yaml` | PASS | `neg-reset-*.png` |
| Scenario B — all offers expire | Observed on device earlier | Booking ends TRIP_CANCELLED after two eligible offers, because only Mang Ben and Mang Joel are in TODA-A | Clock log transitions |
| Scenario E — offline map fallback | Manual adb | **NOT VERIFIED**. A cold launch with network off fails to load the dev bundle (dev build needs Metro). A warm map keeps cached tiles. Needs a release bundle. |  |

### Deviations and notes

- Positive-run setup uses the presenter control **Restore demo locations**, not map taps or GPS. The map opens over Manila, outside the synthetic zones, and the GPS read falls back to a cached position.
- Scenario B as written in the brief requires three expiring offers. The demo has only two eligible drivers for this pickup, so the booking ends after two.
- Driver actions are now at the top of the driver sheet. Maestro cannot scroll to off-screen RN ScrollView children reliably.
- The driver history row now shows the driver's name. The driver queue shows "Body no. AB-014".
- Several failed runs earlier in this session were caused by flow timing and element visibility, not app defects. Those are not counted as results.

### Still outstanding

- Offline map fallback on device (needs a release-style bundle).
- Read-back of the driver history list contents from the device screen.
- Presentation docs: `PRESENTATION_RUNBOOK.md` and `SCREENSHOT_GALLERY.html` are not yet updated for this session.


## 12. Final standalone build — acceptance (2026-10-14)

Earlier results in sections 1 to 11 are kept as recorded. This section covers the final standalone release APK, run without Metro.

### 12.1 Build

| Item | Value |
|---|---|
| Artifact | `dist/presentation/JuanTrike-x86_64-release.apk` |
| Build type | `release` (`./gradlew assembleRelease`) |
| ABI | `x86_64` only (`-PreactNativeArchitectures=x86_64`), matching the emulator. arm64 phones cannot install this build. |
| Size | 27,752,032 bytes (27.75 MB) |
| SHA-256 | `4bc3d3c3fef0219c316c62098a6af4272a5f570aadb15f7610435f99dd4fe37f` |
| JavaScript | Embedded as `assets/index.android.bundle` (1,281,664 bytes). Runs without Metro. |
| Signing | Template debug keystore (`signingConfigs.debug`). Not a production key. Local presentation use only. |
| JDK | JDK 17 at `D:\tools\jdk17-stage4`. Android Studio's bundled JDK 25 failed with CMake "restricted method" warnings for every ABI. |
| Gradle home | `D:\dev-cache\.gradle` (`GRADLE_USER_HOME`), moved off C: to free disk space |
| Result | `BUILD SUCCESSFUL in 5m 21s` |

Failed attempts, kept for the record: arm64 plus x86_64 with JDK 25; x86_64 with JDK 25; x86_64 with JDK 25 and no `JAVA_TOOL_OPTIONS`. All were resolved by the JDK 17 build.

### 12.2 Automated gates (final)

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | PASS (exit 0) |
| Lint | `npx eslint src __tests__ App.tsx` | PASS (exit 0) |
| Jest | `npx jest` | PASS, 5 suites, 64 tests |

New tests in this session: 5 role-switch tests, 3 clock regression tests, and the escalation tests updated for three drivers (dispatch: the third attempt goes to Mang Ernie).

### 12.3 Device runs on the final release APK (emulator-5554, no Metro)

| Workflow | Method | Result | Evidence |
|---|---|---|---|
| Launch without Metro | `adb install -r`, Metro stopped, no `adb reverse` | PASS, Welcome screen shown | none |
| Positive run 5 | Maestro `positive-run.yaml`, RUN=run5, clean state | PASS, 45/45 steps | `screenshots/device/run5-*.png` |
| Positive run 6 | Maestro, RUN=run6, clean state | PASS, 45/45 steps | `screenshots/device/run6-*.png` |
| Driver history read-back | Asserted in runs 5 and 6: `Mang Ben · 1.42 km`, route `DEMO Pickup A → DEMO Destination B`, `Trip completed` | PASS | `run5-07-driver-history.png`, `run6-07-driver-history.png` |
| Passenger history read-back | Same assertions on the passenger side, one entry | PASS | `run5-08-passenger-history.png`, `run6-08-passenger-history.png` |
| Scenario A, driver declines | Maestro `negative-decline.yaml` | PASS, Mang Ben declined and Mang Joel was offered | `neg-decline-release-*.png` |
| Scenario B, three offers all expire | Maestro `negative-three-offers.yaml` | PASS, 20/20. Offers went to Mang Ben, Mang Joel, then Mang Ernie; then `Trip cancelled` | `neg-three-01..04-*.png` |
| Scenario B, passenger view | Passenger screen after the booking ends | PASS. Banner reads "Booking ended — tap New booking to continue". This was fixed in this session; it previously said "Booking in progress". | `neg-three-05-passenger-booking-ended.png` |
| Scenario C, outside coverage | Manual adb, release build | PASS. Destination "DEMO Outside Coverage" refused, explanation shown, Confirm disabled | `neg-outside-release-01-coverage-denied.png` |
| Scenario D, reset during booking | Maestro `negative-reset-active.yaml` | PASS. Booking cleared; no later offer | `neg-reset-release-*.png` |
| Demo controls | Manual adb, release build | PASS. Pause shows "Resume simulation"; Resume shows "Pause simulation"; speed goes 1x to 2x | `release-controls-panel.png` |
| Offline map fallback | Manual adb, release build (see 12.4) | PASS, with limits | `release-offline-*.png` |
| Recovery after network restored | Manual adb, release build | PASS. Live tiles and attribution return | `release-offline-04-network-restored-tiles.png` |

### 12.4 Offline map: what was verified

- **Network off, cache cleared, cold start:** the map shows the synthetic TODA zones as an SVG drawing with labels, plus the message "Map tiles could not be loaded. Check the internet connection." No crash. The map does not show live GPS or a live map. Evidence: `release-offline-03-network-off-no-cache-fallback.png`.
- **Network off, WebView cache present:** the map still shows OpenStreetMap tiles cached during an earlier online session. That is cached geography, not a live map, and the app does not guarantee it. Evidence: `release-offline-02-network-off-cached-tiles-not-fallback.png`.
- **Network restored:** live tiles and attribution return without a manual reset. Evidence: `release-offline-04-network-restored-tiles.png`.
- **Not verified:** tapping the SVG fallback to set a pickup. The overlay chip "Tap the map to set pickup" still appears in fallback mode, and it covers part of the error message.

### 12.5 Deviations and limitations

- **Setup path:** all Maestro booking runs used the demo panel's "Restore demo locations", not a map tap or GPS fix. The map opens over Manila, outside the synthetic zones, and the GPS read falls back to a cached position.
- **Maestro scroll limits:** Maestro cannot reliably scroll to off-screen React Native elements. Several controls were moved to the top of their screens: the offer, accept and decline, trip actions, and history. This is a layout change, not a logic change.
- **Scenario B:** the three-offer scenario needs a third eligible driver. The fixture now has Mang Ernie (TODA-A, AE-047) at the end of the FIFO queue. Dispatch ends the booking after the third attempt (`MAX_OFFER_ATTEMPTS = 3`).
- **Example booking clears history:** the demo panel's "Trigger example booking" runs a full reset, which clears trip history. The positive runs do not use it.
- **ABI:** the APK is x86_64 only. Physical arm64 phones cannot run it.
- **Signing:** the APK uses the template debug keystore. It is for local presentation only and must not be distributed as a production build.
- **Offline:** a cold launch with the network off works only because the bundle is embedded. A cold launch of the dev build without Metro fails (an earlier finding).
- **Earlier runs** (runs 1 to 4, the decline, reset, and outside-coverage checks on the dev build, and the first three-offer attempts) are kept above. They used the dev build and are repeated on the release APK only where section 12.3 lists them.

### 12.6 Screenshot inventory (final)

- `docs/presentation/screenshots/device/`: 57 PNGs from runs 1 to 6, the decline, three-offer, reset and outside-coverage runs, and the release-build offline and controls captures.
- Every image referenced in `SCREENSHOT_GALLERY.html` is checked to exist.

### 12.7 Final verdict

**PRESENTATION_READY, for a local presentation on the x86_64 emulator, with the limitations in 12.5.**

Mandatory checks, all on the final release APK unless noted:

| # | Requirement | Status |
|---|---|---|
| 1 | Simulation clock advances on Android | PASS (dev logs; release runs 5 and 6) |
| 2 | Passenger booking progresses automatically | PASS |
| 3 | Driver offer is generated | PASS |
| 4 | Driver accepts | PASS |
| 5 | Passenger sees the assigned driver | PASS (runs 5 and 6) |
| 6 | Simulated approach works | PASS |
| 7 | Trip starts and progresses | PASS |
| 8 | Trip completes | PASS |
| 9 | DEMO cash collection recorded | PASS |
| 10 | Passenger history contains the trip, one entry | PASS |
| 11 | Driver history contains the trip, one entry | PASS |
| 12 | Reset works | PASS (release, scenario D) |
| 13 | Second full positive scenario succeeds | PASS (run 6) |
| 14 | Required negative scenarios verified | PASS on release: decline, three offers, outside coverage, reset. Offline fallback PASS with limits (12.4). |
| 15 | Demo controls work | PASS (release: pause, resume, speed) |
| 16 | Android screenshots captured | PASS |
| 17 | TypeScript, lint and Jest pass | PASS (64/64) |
| 18 | Presentation documents complete | Updated in this session: this section, the runbook, and the gallery |
| 19 | No mandatory screen is broken | PASS (runs 5 and 6 and the captures) |
| 20 | No backend services needed | PASS (none used) |

**Remaining risks before presenting:** emulator and host RAM (see the runbook's slow-emulator section); the setup path uses a presenter control, not a map tap; the offline fallback is a drawing, not a map.

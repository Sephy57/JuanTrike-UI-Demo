# JuanTrike Client Presentation Runbook

## Before the meeting

- Last built visual/map APK: `dist/presentation/JuanTrike-V3-Android-Presentation.apk` (SHA-256 `6F94D1301CA52751881FF207B81EC0D0BBC848B4D14BAD0D161CDECFDFDDC669`). It predates the current TODA tap pass-through and Active Trip hierarchy fixes. The AOSP emulator became nonresponsive during launch/screenshot capture; no screenshot or map-tap evidence belongs to this APK. Source checks now pass, but do not present this APK as containing the current source changes. Keep status **PARTIAL**. Historical journey evidence for SHA `746FD51…` is preserved at `dist/presentation/JuanTrike-V3-Android-Presentation-pre-visual-map-20261017.apk`; the earlier stable journey APK SHA `056DE18…` and screenshots remain separate.
- A clean-boot AVD retry with a 1.5 GB runtime cap was stopped before app launch when available RAM reached 2.17 GB. The emulator is now stopped; the host recovered to 4.3 GB available RAM. Do not present the older APK screenshots as evidence for the latest visual/map build.
- Current packaging handoff (2026-10-17): the host had 6.26 GB available RAM, below the preserved 6.5 GB Gradle gate; C: had 5.13 GB free and D: 202.13 GB. No ADB device or Java/Gradle/emulator process was present. Do not start Gradle from this snapshot. When safe, stop the emulator and make one x86_64-only release attempt with one Gradle worker and parallel mode disabled, reusing the existing D: caches/native outputs. Keep the standard Expo `export:embed`, release lint, packaging and signing tasks enabled; the existing standalone HBC export cannot safely replace Gradle's Android bundle input. Set `TEMP`, `TMP` and Java temp to the existing D: cache directories in the build shell. See the latest checkpoint in `ANDROID_ACCEPTANCE_RESULTS.md`.
- Latest safety recheck after stopping the build: 4.30 GB RAM available, 7.04 GB C: free, and 202.45 GB D: free. The emulator is stopped and no device is attached. The prior retry log shows a Windows emulator-window composition error; the retained evidence does not isolate the earlier ADB stall or prove an app ANR. The source build also reached 1.84 GB available RAM during Metro bundling and was stopped. Use the diagnosis and conservative resource target in `ANDROID_ACCEPTANCE_RESULTS.md` before another build or device session.
- Current source verification after the map-tap and Active Trip hierarchy changes: TypeScript, Expo lint, Expo Doctor (21/21), and Jest (17 suites / 148 tests) pass. ADB reports `DEVICE_NOT_CONNECTED`. The actual latest APK still predates both changes; do not present it as their evidence. Build/install when a device or safe emulator acceptance path is available.
- A single source-update APK attempt was stopped during Metro bundling when available RAM fell to 1.84 GB. No updated APK was produced; the existing `6F94D130…` artifact is preserved. See `build-logs/gradle-v3-source-ui-update-20261017.log`. Do not repeat the build until sufficient memory is available for bundling and a device acceptance path is present.
- Confirm the map has network access if street tiles are desired. The demo keeps local markers, route lines, zones and city outline available offline, but it does not include cached street tiles.
- Use the demo panel to restore the example locations and reset the booking before each run.
- Select the preferred language. Keep the city outline and separate synthetic TODA zones visible when discussing coverage.
- If asked about GPS, explain that it is a foreground one-shot read and the emulator is simulated. On the final V3 candidate, denying permission showed the fallback “You can still tap the map to choose pickup.”
- Use **About this app** to explain that bookings/dispatch are local simulations, fares are estimates, no payments are processed, driver movement may be simulated, and mapped TODA/city coverage is not official approval. Staff-role screens in the companion role UI specification are concepts, not app routes.

## Target screen flow

The intended visual reference is `design-reference/juantrike-target-ui.png`. Passenger mode places the pickup/destination card over the live Leaflet map, with the vehicle/fare summary and booking action below. Driver mode shows online status, demo trip/earnings summary, the prioritized booking offer with countdown, route preview, and accept/decline actions. During an active trip, use the route stage/progress and driver details on the passenger side or the pinned lifecycle actions on the driver side. These controls use the existing shared demo booking state.

The current source passes TypeScript, ESLint, 17 Jest suites / 148 tests, and Expo Doctor 21/21. The recorded 2026-10-17 Android JS export and APK build passed for earlier source; APK signature and ARM64/x86_64 contents were verified. The latest emulator session installed the package but did not return a usable screenshot; manual touch acceptance was not reached. Prior polygon-refinement screenshots in `docs/screenshots/device/20261017-juantrike-v3-polygon-refinement/` belong to SHA `746FD51…`, now preserved as a dated copy. The older stable V3 journey remains in `docs/screenshots/device/20261017-juantrike-v3-final/` and belongs to SHA `056DE18…`. Visual match, especially the missing illustrated logo and map/screen composition, remains unaccepted. Keep status **PARTIAL**.

## Suggested 5-minute walkthrough

1. **Identity and roles:** Show the JuanTrike landing screen, then enter the passenger flow. Open About to introduce the prototype boundaries before discussing sample journeys.
2. **Map and booking:** Use the bundled example pickup/destination within the mapped city and synthetic zone. Explain the preview as an estimate, not a real request or fare quote.
3. **Dispatch simulation:** Run the example booking. Show request, search, synthetic driver offer and the countdown. The driver profile is fictional.
4. **Driver response:** Switch to the driver route, accept an offer, then show route progress. Pause and resume, and use a faster demo speed to make a small movement visible.
5. **Limits:** Reset, show the outside-synthetic-zone rejection, and show the route-source label when geometry is illustrative. With network disabled, the final V3 capture displays “Offline — live map tiles unavailable”; local synthetic overlays remain and OSM tiles are not bundled offline.

## Controls

The demo panel is the presenter control surface for language, passenger/driver mode, pause/resume, demo speed, restoring demo locations, example booking, and reset. Use fresh, deterministic state before demonstrating a terminal outcome. The source UI and device acceptance notes identify the exact status transitions verified on the installed build.

Driver accept/decline and the next route/trip action stay pinned at the bottom of the driver screen, independent of the scrollable trip details.

## Language for client discussion

Call this a **local Android presentation build** with **synthetic drivers and TODA zones**, **indicative mapped-city geofencing**, **general OpenStreetMap route geometry**, and **foreground-only GPS**. Do not call it production dispatch, an official TODA roster, legally approved service area, live traffic navigation, or a payment-ready booking system.

## Build evidence

The APK path, SHA-256, build command, emulator/device status, screenshot paths, and verified scenarios are recorded in [Android acceptance results](ANDROID_ACCEPTANCE_RESULTS.md). Current-candidate smoke screenshots, prior-V3 journey evidence, and earlier baseline evidence are separate. The rejected map-focus diagnostic is preserved under `docs/screenshots/device/20261017-juantrike-v3-mapfocus-anr-investigation/` and must not be presented as accepted evidence or attributed to the current candidate.

The Driver dashboard's 4.9 value is a synthetic fixture. It is labeled **Demo rating** (Filipino: **Markang demo**) and must not be described as a driver's actual reputation or customer rating. Current source checks passed, but the last preserved APK predates the latest UI source changes; use its evidence only for its recorded hash and do not present it as the current source build.

## Earlier source-only checkpoint — 2026-10-17 (superseded by the current checkpoint below)

The current source uses the separately supplied illustrated JuanTrike logo on Welcome, Passenger, and Driver screens. The source also adds a pickup/destination swap control and regression coverage for location selection delivered through the map callback, fare/route preview, and out-of-coverage booking refusal. The callback is exercised in Jest; touchscreen behavior still needs a rebuilt APK and Android device/emulator evidence.

Current checks: TypeScript, Expo lint, Jest (18 suites / 152 tests), and Expo Doctor (21/21) all pass. The last preserved APK (`6F94D130…DDC669`) predates these source updates. Pre-build readings were 6.57 GB and 6.51 GB. The first guarded attempt was stopped at 3.85 GB during CMake. The second (ARM64/x86_64) attempt produced a 1,300-module production Android bundle, then was stopped at 3.96 GB before APK packaging. RAM recovered to 6.48 GB after stopping; C: had 5.15 GB free, D: 202.16 GB free, and ADB listed no device. Do not use the older screenshots as evidence for the latest source or present this checkpoint as Android or visual acceptance. Keep the runbook verdict **PARTIAL** until the updated artifact is launched, exercised, and compared with the reference.

## Current source checkpoint — 2026-10-17

Source gates are green: TypeScript, ESLint, Jest (18 suites / 152 tests), Expo Doctor (21/21), and Android JavaScript export (1,300 modules). The export and caches are on D:. The current UI uses the supplied project-owned logo and the Driver dashboard's Ride queue is an empty state unless real application state contains requests; static demo driver profiles are no longer presented as pending rides. FIFO matching behavior was not changed.

**Do not present this source as device-accepted.** The preserved APK (`6F94D130…DDC669`) predates these source updates. The latest RAM snapshot after export is 6.18 GB available, below the 6.5 GB build threshold; ADB has no connected device. Resume only when resource conditions meet the guarded build requirement, then install the new APK and capture genuine current-artifact screenshots. Verify direct map taps on Android and compare Passenger, incoming Driver request, approach, active trip, and completion against `design-reference/juantrike-target-ui.png`. Overall status remains **PARTIAL**.

### Resource recheck — 2026-10-17

The later host snapshot is 5.83 GB RAM available, C: 5.14 GB free, and D: 202.14 GB free. ADB has no connected device, and no project Gradle/emulator process is running. This supersedes the 6.18 GB post-export reading above. Keep the Android build and device acceptance deferred until the resource gate and device path are both available.

### Latest source validation — 2026-10-17

Passenger pickup/destination accessibility labels now announce the place or next map-tap action and expose selection/disabled state. Current source gates pass: TypeScript, ESLint, Jest (18 suites / 154 tests), Expo Doctor (21/21), and Android JS export (1,300 modules; HBC SHA-256 `9763622EBB87EDCF681FD4766AC77FE8D5235BB60D436B7FECC5E525DCD466C`). Available RAM after export is 5.91 GB, with 5.13 GB free on C: and 202.13 GB on D:. ADB has no device. The preserved APK predates these source changes; do not treat this export as Android acceptance. Keep status **PARTIAL**.

Latest post-validation gate: 6.06 GB RAM available, 5.13 GB free on C:, and 202.13 GB free on D:. ADB still has no connected device. The Android build and device acceptance remain deferred.

### Latest resource and cache-path recheck — 2026-10-17

The newest host snapshot is 6.23 GB available RAM, 5.12 GB free on C:, and 202.13 GB free on D:. ADB has no device. No JuanTrike Java, Gradle, emulator, or Node process was running; unrelated ChatGPT, Codex, Defender, and Chrome processes were left untouched. The existing Gradle/npm/temp/Expo caches, Android SDK, AVD, JDK 17, and build output paths are on D:. No Gradle build was started below the 6.5 GB gate.

Current recheck: 6.20 GB RAM available, 5.12 GB free on C:, 202.13 GB free on D:, and no ADB device. No JuanTrike-owned Java, Gradle, emulator, or Node process is available to stop. Keep the APK build and device acceptance blocked until system resources or device availability changes.
- Latest artifact (2026-10-17): `dist/presentation/JuanTrike-Final-Presentation.apk`, 43,925,855 bytes, SHA-256 `826D93C0F19B57EE97561AFBEFECE727B4698E163C9F4197ADB0DC2D4A27DEAE`; x86_64, package `com.juantrike.uidemo` v1.0.0, SDK 24–36, APK v2 signature verified with the Android Debug certificate. Current JS bundle and approved logo are verified inside the package. A cold offline launch reached React Native `Running "main"`, but the emulator displayed “System UI isn’t responding”; journey and visual acceptance are incomplete. Keep overall status **PARTIAL**. See `ANDROID_ACCEPTANCE_RESULTS.md` for evidence and screenshot path.

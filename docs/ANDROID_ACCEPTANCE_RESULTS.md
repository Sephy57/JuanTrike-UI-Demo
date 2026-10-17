# Android Acceptance Results

**Release status: PARTIAL — not `CLIENT_PRESENTATION_READY`.** Current source has the TODA-map tap pass-through fix, a targeted Active Trip hierarchy adjustment, and a demo rating in the Driver summary. TypeScript, ESLint, Expo Doctor, and Jest (17 suites / 148 tests) pass. The last built APK, SHA-256 `6F94D1301CA52751881FF207B81EC0D0BBC848B4D14BAD0D161CDECFDFDDC669`, predates these source changes; no current-source APK or device evidence exists. After the stopped build, 4.30 GB RAM was available, C: had 7.04 GB free, D: had 202.45 GB free, and ADB reported no attached device. Earlier V3 journey results below belong to their explicitly listed APK hashes and are not evidence for current source. Visual acceptance and on-device map behavior remain unverified.

## Latest source-only verification — 2026-10-17

This checkpoint supersedes the 148-test source-only entries below. TypeScript PASS; Expo lint PASS; Jest PASS (18 suites / 152 tests); Expo Doctor PASS (21/21). New focused Passenger regressions cover map-coordinate callback selection of both endpoints, route/fare preview and valid booking eligibility, plus refusal of booking when a selected pickup is outside synthetic coverage. They drive a React Native test double, not the native WebView or Android touchscreen. `MapView.test.tsx` separately verifies the Leaflet message bridge and coverage polygon click pass-through.

The supplied illustrated logo now exists as the unchanged source reference at `design-reference/juantrike-logo.png` and a transparent display asset at `assets/juantrike-logo.png`, used on Welcome, Passenger, and Driver source screens. The current source still has no rebuilt APK. The previously verified APK and its hash remain preserved, but it predates these changes. Pre-build RAM checks were 6.57 GB and 6.51 GB. A guarded 4-ABI Gradle attempt stopped at 3.85 GB during CMake. A second ARM64/x86_64 attempt bundled Android JavaScript successfully (1,300 modules; 2,775,000 bytes; SHA-256 `8B8261EBBEF5FBF574055A9C63E5D787CB18262F75826D08578ABB49552B58C8`) but was interrupted at 3.96 GB during release lint, before APK packaging. After stopping, RAM recovered to 6.48 GB; C: had 5.15 GB free, D: 202.16 GB free, and ADB listed no device. The preserved APK remained unchanged. No current-source install or screenshots exist. Current-source Android functionality and visual match remain **NOT VERIFIED**; release status remains **PARTIAL**.

## Current source-only update — 2026-10-17

The Driver dashboard summary now uses a synthetic demo rating from the selected driver fixture in place of the TODA/body-number tile. The Active Trip card places its route-stage indicator before the map, enlarges the active map, and separates ETA and remaining-distance tiles from driver identity. Shared simulation state, route calculation, GPS, and lifecycle controls are unchanged. DriverScreen tests cover the rating tile and Active Trip section order. Focused test: PASS (5 tests); final full checks after these source changes: TypeScript PASS, Expo lint PASS, Jest PASS (17 suites / 148 tests), Expo Doctor PASS (21/21). One bounded Android Release build attempt used JDK 17, one worker, `--no-parallel`, and D:-hosted caches; it was stopped during Metro bundling when available RAM reached 1.84 GB. No new APK or Android JS bundle was produced. Log: `build-logs\gradle-v3-source-ui-update-20261017.log`. The existing 6F94… APK does not contain these UI changes or the earlier Leaflet polygon pass-through fix. ADB reports `DEVICE_NOT_CONNECTED`; current-source Android acceptance remains unverified. Since that combined build consumed about 2.4 GB of available RAM, wait for at least 6.5 GB available before another build if retaining a 4 GB reserve; also require a device or stable emulator path to capture the result.

## Prior map-tap source revision and last built APK — 2026-10-17

| Check | Result | Evidence |
| --- | --- | --- |
| Source changes | PASS — implementation updated | Passenger layout/map proportions, visible TODA-A fill, marker sizes, driver offer density and active-trip preview were previously adjusted. This source-only fix makes TODA coverage polygons non-interactive so map taps inside them reach Leaflet's map click handler; endpoint/vehicle/terminal markers keep bubbling disabled. Coordinates and camera behavior were not changed. |
| TypeScript / ESLint / Jest / Expo Doctor | PASS | Rerun after the map fix: TypeScript and Expo lint exited 0; Expo Doctor 21/21; Jest 17 suites / 147 tests passed. The first full run had one 5-second Passenger test timeout; that suite passed alone and the next complete run passed. The new regression checks coverage tap pass-through. |
| Android JS bundle/export for current source | INCOMPLETE — stopped | The single Release attempt stopped while Metro was bundling; no complete current-source bundle/export was produced. Log: `build-logs\gradle-v3-source-ui-update-20261017.log`. |
| Current-source APK build | STOPPED FOR RESOURCE SAFETY | Gradle/Metro was interrupted at 1.84 GB available RAM. No current-source APK was produced. The original artifact was preserved and its SHA-256 reverified after interruption. |
| Last APK build | PASS — prior source only | Gradle 9.3.1, JDK 17, one worker, `--no-parallel`, ARM64/x86_64; 6m41s, 590 tasks (36 executed, 554 up-to-date). Log: `build-logs\gradle-v3-visual-map-20261017.log`. This APK does not include the current map-tap fix. |
| Last APK integrity | PASS — prior source only | `dist\presentation\JuanTrike-V3-Android-Presentation.apk`; 63,792,497 bytes; SHA-256 `6F94D1301CA52751881FF207B81EC0D0BBC848B4D14BAD0D161CDECFDFDDC669`; v2 signature verifies; local debug certificate; ARM64 and x86_64; embedded bundle 2,773,568 bytes. |
| Prior APK preservation | PASS | Before replacing the requested artifact, copied and verified SHA `746FD51AC8A20E36BB0839C4B8BDA656C79009EDC2C86F3C656AEA2ABC8D6D1B` to `JuanTrike-V3-Android-Presentation-pre-visual-map-20261017.apk`. |
| Last APK install | PASS — package manager response, prior source | `adb install -r -d` reported `Success` on `JuanTrike_API36_AOSP_X86_64`. The launch event was dispatched and a package process was observed. Installed-byte SHA was not pulled before the emulator stalled. |
| Visible launch and screenshots | NOT VERIFIED | ADB screencap and later activity/shell requests did not return. The emulator window became nonresponsive, available RAM fell below 2 GB, and a graceful close did not finish. Only the JuanTrike test emulator process was terminated. There is no accepted screenshot from this APK. |
| Controlled clean-boot retry | BLOCKED before app launch | Reused the same D:-hosted AVD, visible window, no snapshot load/save, and `-memory 1536`. It remained responsive, but host available RAM reached 2.17 GB during boot; the retry was stopped before opening JuanTrike. Available RAM recovered to 4.3 GB after emulator shutdown. Log: `build-logs\emulator-v3-visual-map-retry-20261017.*`. |
| Current source tap chain | PASS — source/unit level only | WebView `tap` messages reach the Passenger callback; on an empty Passenger state, the first background tap sets pickup and advances selection to destination, and the next sets destination. Geofence, route and fare derive from shared state. Leaflet 1.9.4 documents `interactive:false` paths as acting as part of the underlying map. This does not prove Android WebView touch delivery. |
| Active Trip layout order | PASS — source/test level only | Current source renders status, route stages, map, ETA/distance tiles, and driver identity in that order; `DriverScreen` verifies the order. No screenshot from the updated source exists. |
| Physical device | DEVICE_NOT_CONNECTED | `adb devices -l` lists no device. No authorized physical Android device is available for this session. |
| Manual map taps / current-source journey / visual comparison | NOT VERIFIED | No current-source APK has been built or installed; no current-artifact screenshots exist. Historical screenshots below apply only to their labeled APK hashes. |

The failed capture attempt is not classified as a JuanTrike crash or ANR: no usable screenshot, foreground-activity result, or attributable crash trace was obtained. Emulator logs and the capture-attempt folder remain under `build-logs\emulator-v3-visual-map-20261017.*` and `docs\screenshots\device\20261017-juantrike-v3-visual-map-acceptance\`.

## Emulator failure investigation — 2026-10-17

| Signal | Observation | Interpretation |
| --- | --- | --- |
| Host resources now | Latest recheck after stopping the build: 4.30 GB available RAM; C: 7.04 GB free; D: 202.45 GB free; no emulator/qemu process. ADB host server responds, but `adb devices -l` lists no device. | The emulator is stopped. Host ADB responsiveness does not establish guest responsiveness. |
| Memory during prior controlled retry | Host RAM fell from about 4.3 GB to 2.17 GB during emulator startup, before JuanTrike was launched. | The device consumes about 2.1 GB of host-available RAM on this machine during boot. Another emulator attempt at the current 4.24 GB would leave too little safety margin, so it was not started. |
| Emulator configuration/runtime | The retained API 36 AOSP AVD is D:-hosted. Its boot log says the emulator increased guest RAM to 2560 MB. | The requested 1.5 GB cap did not constrain the effective guest configuration to 1.5 GB. This aligns with the measured host-memory drop; exact QEMU private/working-set telemetry was not retained. |
| Windows graphics/window signal | `emulator-v3-visual-map-retry-20261017.out.log` records failure to load `opengl32sw`, fallback to AMD host OpenGL/Vulkan, then `UpdateLayeredWindowIndirect failed ... (A device attached to the system is not functioning.)`. | This is evidence of a host emulator-window/composition problem during retry, not proof of an Android app failure. The log does not establish whether it caused the earlier screenshot stall. |
| ADB, ActivityManager, guest memory and WebView | The first attempt's screencap/activity-shell calls stalled. The retry was stopped before JuanTrike launch. No contemporaneous latest-artifact logcat, bugreport, `dumpsys`, guest `/proc/meminfo`, Chromium renderer trace or input-dispatch ANR record was retained. | Guest memory, ActivityManager lifecycle and WebView health for SHA `6F94…` cannot be determined from current evidence. Do not call this an app ANR or claim the app is stable. |
| Physical-device fallback | `adb devices -l` reports no attached device. | No authorized physical Android device is available to this session for replacement acceptance evidence. |

**Diagnosis:** the evidence points to host resource pressure during emulator startup and a separate Windows emulator-window graphics/composition error. The exact cause of the first ADB screenshot/activity stall is **not isolated**, because guest diagnostics were not captured. No product code was changed based on this incomplete diagnosis. Do not retry Gradle or the emulator at current resource levels. For a future controlled attempt, use a physical device if one is attached, or wait until host RAM is high enough that the observed ~2.1 GB emulator startup cost still leaves at least 4 GB available (a conservative starting target is about 6.2 GB); keep Metro and Gradle stopped and capture logcat/bugreport plus host process memory before and during the session. Emulator logs show crash/session metadata paths under Windows `%LOCALAPPDATA%\Temp`; C: free space remained at 7.07 GB across the final measurements, but those metadata files' exact footprint was not measured. Set process-scoped `TEMP`/`TMP` to `the D:-hosted temporary directory` for a future session, while retaining the verified SDK, AVD, Gradle, npm and Java paths on D:.

## Earlier polygon-refinement checks — historical, superseded by the latest checks above

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript | PASS — no errors | `npx tsc --noEmit`. |
| ESLint | PASS — exit 0 | `npx expo lint`. |
| Jest | PASS — 17 suites / 145 tests | `npx jest --runInBand`; freshly rerun after final source changes. Full output: `build-logs\source-checks-v3-final-20261017.log`. |
| Expo Doctor | PASS — 21/21 | `npx expo-doctor`. |
| Final Android JS export | PASS | Expo Android export bundled 1,299 modules; output `dist\export-android-v3-polygon-refinement-20261017\`; HBC 3,332,513 bytes, SHA-256 `963C1B3045B45E9281B60E93715BDFE497417FA28B7457320F01C0927D3EFD22`. |
| Final V3 APK build | PASS | Gradle 9.3.1, JDK 17, one worker, `--no-parallel`, ABIs `arm64-v8a,x86_64`; 6m22s, 546 tasks (36 executed, 510 up-to-date). Log: `build-logs\gradle-v3-polygon-refinement-20261017.log`. |
| Final APK integrity | PASS | 63,792,317 bytes; SHA-256 `746FD51AC8A20E36BB0839C4B8BDA656C79009EDC2C86F3C656AEA2ABC8D6D1B`; package `com.juantrike.uidemo` v1.0.0, min SDK 24 / target 36; v2 signature verified; `arm64-v8a` and `x86_64`; embedded JS 2,773,388 bytes. Local debug certificate only. |
| Final install / standalone launch | PASS | Installed on `JuanTrike_API36_AOSP_X86_64`; pulled installed `base.apk` matched SHA `746FD51…`. Welcome launched without Metro. Genuine screenshots: `docs\screenshots\device\20261017-juantrike-v3-polygon-refinement\`. |
| Route-camera experimental APK | NOT ACCEPTED | SHA-256 `5398441C70B656ABB80BB5183D8CC92A9A93C3868E6604AE0F4601BD267AFF82`; loaded a route-focused map, then the app ANR'd after an input at the map controls and Android surfaced `org.chromium.webview_shell`. This change was reverted; APK and captures are preserved separately and are not the stable artifact. |

The app uses Expo SDK 57. The added `expo-network` package is the SDK-matched `~57.0.2`; Android platform permissions are supplied by the package manifest/config integration. The map combines the native network state with its WebView state so a disconnected device is not represented as having live tiles.

## Preserved APK artifacts

| Item | Result |
| --- | --- |
| Tested baseline APK | `dist\presentation\JuanTrike-Android-Presentation.apk` |
| Size | 63,770,645 bytes |
| SHA-256 | `F41A3F1CCF9450A6B752A9833B5546CB27C1FCBC7EBEAB64B28C05C277493F6A` |
| Package / version | `com.juantrike.uidemo`, `1.0.0`, version code `1` |
| SDK | Minimum 24; target 36 |
| ABIs | `arm64-v8a`, `x86_64` |
| Embedded JavaScript | `assets/index.android.bundle`, 2,760,356 bytes |
| Signing | APK v2 signature verified; local Android debug certificate, SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`; not production-signed |
| Preservation copy | `dist\presentation\JuanTrike-Android-Presentation-startup-verified-20261016.apk`; SHA-256 matches the tested baseline |
| Earlier pre-final copy | `dist\presentation\JuanTrike-Android-Presentation-pre-final-ui-fixes-20261016.apk`; SHA-256 `933686E6C7DB6FC0B615203B1D69292ADCC0384FEDC3A3329996F58C12D1BA0B` |
| Former stable V3 APK (preserved at dated copy below) | `dist\presentation\JuanTrike-V3-Android-Presentation-pre-route-camera-change-20261017.apk`; 63,792,029 bytes; SHA-256 `056DE18BF99EEBDF4ABC4B5D5FD509167C9BBC4755B18C54DED9AA0DA929DC25` |
| Final polygon-refinement V3 APK (requested artifact path) | `dist\presentation\JuanTrike-V3-Android-Presentation.apk`; 63,792,317 bytes; SHA-256 `746FD51AC8A20E36BB0839C4B8BDA656C79009EDC2C86F3C656AEA2ABC8D6D1B`; installed base.apk matched |
| Superseded camera-refinement V3 candidate | SHA-256 `71C2390D81FC481E9F9E66C1CACCB5DFADD00B9C5612169B55DD3E1BB33E7B3D`; retained smoke screenshots are separate |
| Preserved prior stable V3 APK | `dist\presentation\JuanTrike-V3-Android-Presentation-pre-route-camera-change-20261017.apk`; SHA-256 `056DE18BF99EEBDF4ABC4B5D5FD509167C9BBC4755B18C54DED9AA0DA929DC25`; retains the previously verified seeded journey artifact |
| Pre-build preservation copy | `dist\presentation\JuanTrike-V3-Android-Presentation-pre-product-copy-20261017.apk`; SHA-256 `BF1B0F23B876BE0D27722EF7D27364AC192230B3666D1CB9B37EF8520CF568BF` |
| Pre-map-focus preservation copy | `dist\presentation\JuanTrike-V3-Android-Presentation-pre-map-focus-20261017.apk`; SHA-256 matches the stable V3 APK above |
| Reverted camera experiment | `dist\presentation\JuanTrike-V3-Android-Presentation-mapfocus-anr-investigation-20261017.apk`; SHA-256 `5398441C70B656ABB80BB5183D8CC92A9A93C3868E6604AE0F4601BD267AFF82`; not accepted |

The preserved baseline APK is not V3 evidence. The rows below distinguish the prior V3 journey from the current-source candidate smoke evidence.

## Previous polygon-refinement Android device observations — historical evidence

| Scenario | Result | Evidence and boundary |
| --- | --- | --- |
| Prior stable V3 seeded journey | PASS — prior artifact only | `v3-final-*` evidence below came from APK SHA `056DE18…`, preserved at `JuanTrike-V3-Android-Presentation-pre-route-camera-change-20261017.apk`. Do not attribute this journey to the current candidate. |
| Final V3 launch and Passenger / Driver screens | PASS | Exact artifact SHA `746FD51…` launched standalone. `welcome.png`, `passenger.png`, and `driver-offer.png` show the app; OSM tiles/attribution and both role screens render. |
| Final V3 sample request / FIFO offer | PASS — presentation-seeded | `sample-request.png`, `expiry-offer-1.png`, and `driver-decline-next-offer.png` evidence the sample request and next FIFO offer after decline. Direct map-tap endpoint selection was not isolated. |
| Final V3 driver decline and three expirations | PASS | `driver-decline-next-offer.png` shows the next queued offer after decline. `offer-expiry-1.png`, `offer-expiry-2.png`, and `offer-expiry-3-no-driver.png` document three successive timeouts and terminal cancellation/no-driver state. |
| Final V3 approach, trip start/completion and histories | PASS — synthetic journey | `accepted.png`, `approach.png`, `trip-started.png`, `completed.png`, `passenger-history.png`, and `driver-history.png` show progress and both histories. |
| Final V3 pause/resume and reset during active offer | PASS | `paused.png`/`resumed.xml` show both states. `reset-active-before.png` shows a live offer; `reset-active-after.png` and its XML show Driver Dashboard / No active trip after reset. |
| Prior V3 Passenger screen and OSM | PASS — prior artifact only | `v3-final-passenger.png` and `v3-final-passenger-locations.png` show Passenger UI, attribution, tiles, boundary, seeded Angeles City endpoints, route and estimate. These images belong to SHA `056DE18…`; manual map taps were not exercised. |
| Prior V3 booking confirmation and FIFO offer | PASS — prior artifact only | `v3-final-driver-offer-2.png` shows the offer/countdown; acceptance is shown in `v3-final-accepted-approach.png`. Synthetic presentation request; artifact SHA `056DE18…`. |
| Prior V3 driver approach, arrival, start and completion | PASS — prior artifact only | `v3-final-driver-approach.png`, `v3-final-arrived-pickup.png`, `v3-final-trip-started.png`, and `v3-final-trip-completed.png` show the journey on SHA `056DE18…`. |
| Prior V3 Passenger history | PASS — prior artifact only | `v3-final-passenger-history.png` shows the completed 1.42 km / ₱39 estimate. A separate Driver history view was not captured on that APK. |
| Prior V3 outside synthetic coverage | PASS — prior artifact only | `v3-final-outside-coverage.png` shows an out-of-coverage destination and disabled Book Ride on SHA `056DE18…`; the warning card is partly below the sticky action area. Final-candidate coverage rejection is in `outside-coverage.png`. |
| Final V3 GPS permission denial | PASS | Location permissions were revoked, Android's prompt was denied, and `gps-denied.png`/XML show the manual map-selection fallback message. No GPS fix was claimed. |
| Final V3 offline fallback | PASS — status indicator | Wi-Fi/mobile data were disabled; `offline.png`/XML show “Offline — live map tiles unavailable.” Connectivity was restored. This does not prove that all OSM tiles are absent from cache. |
| Manual map-tap endpoint selection | NOT VERIFIED | Captured candidate routes use presentation-seeded locations; direct map taps were not conclusively isolated. |
| Extra post-install role-navigation probe | NOT ACCEPTED | A final navigation attempt returned to the Android launcher; `launcher-after-navigation-attempt.png` is preserved. The cause was not isolated, so this is neither counted as an app crash nor a successful role-switch check. |
| Reverted route-camera experiment | FAIL — ANR observed | The experimental APK opened a zoomed map. A later input at `(990,1035)` was followed by an input-dispatch ANR; Android killed the app and surfaced `org.chromium.webview_shell`. The change was reverted, with APK and screenshots preserved separately. |
| Physical Android device | NOT TESTED | Only emulator runtime evidence is available. |

## Genuine screenshot inventory from historical APKs

Final polygon-refinement screenshots: `docs\screenshots\device\20261017-juantrike-v3-polygon-refinement\` from exact APK SHA `746FD51…`. Prior V3 journey screenshots remain in `20261017-juantrike-v3-final` from SHA `056DE18…`; intermediate camera-refinement smoke captures remain in `20261017-juantrike-v3-camera-refinement-final` from SHA `71C239…`. Route-camera ANR diagnostic captures remain separate under `20261017-juantrike-v3-mapfocus-anr-investigation`. Earlier baseline evidence remains under `20261016-juantrike-v3-aosp-emulator` and `20261017-juantrike-v3-aosp-emulator`.

The `v3-final-*` files include Welcome, Passenger initial/selected route, Driver offer, accepted approach, arrival, started/completed trip, Passenger history, outside-coverage, GPS denial and offline captures. These are direct ADB `screencap` images; XML files are UIAutomator dumps where the dumper completed. No reference artwork was used as an app screenshot.

## Storage and build constraints

The checkout, APKs, Android SDK/AVD, Gradle/npm/Jest caches, Java temp, export, and build logs are on D:. `%USERPROFILE%\.gradle` is absent; `%USERPROFILE%\.expo` is a junction to D:-hosted Expo data; npm cache was explicitly set to `the D:-hosted npm cache`; Android SDK is `the D:-hosted Android SDK`; AVD is `the D:-hosted AVD`; Gradle cache is `the D:-hosted Gradle cache`; Java temp and `TEMP`/`TMP` were set under `D:\dev-cache`. No project-owned cache or build output was found unexpectedly using substantial C: storage. Before the final APK build, available RAM was 4.04 GB, C: free 6.79 GB, D: free 202.84 GB, and the emulator was stopped. After all device checks, the emulator was gracefully stopped; latest observed values were 7.65 GB available RAM, C: free 6.77 GB, D: free 202.56 GB. No cache/toolchain duplication, broad cleanup, security changes, or unrelated-process termination was done.

Intended build environment: `GRADLE_USER_HOME=the D:-hosted Gradle cache`, npm cache `the D:-hosted npm cache`, Expo user data `the D:-hosted Expo cache`, Android SDK `the D:-hosted Android SDK`, Android user data `D:-hosted Android user data`, AVD data `the D:-hosted AVD`, JDK `JDK 17 on D:`, and temp/Java temp under `D:\dev-cache`.

## Interpretation

The latest requested artifact is SHA `6F94D1301CA52751881FF207B81EC0D0BBC848B4D14BAD0D161CDECFDFDDC669`; build, signature, ABIs, package metadata and package-manager installation are verified. Latest-artifact visible launch, installed-byte identity, genuine screenshots, manual map taps and device journey are not verified because the AOSP emulator stalled during capture; a memory-capped retry was stopped before app launch. The preceding polygon-refinement APK at SHA `746FD51…` is preserved at `JuanTrike-V3-Android-Presentation-pre-visual-map-20261017.apk` with its historical journey evidence. The stable V3 APK at SHA `056DE18…` and the rejected route-camera ANR experiment remain separately labeled. Final status is **PARTIAL**. Do not mark `CLIENT_PRESENTATION_READY`.

## Earlier recovery checkpoint — 2026-10-17 (superseded by the latest validation and export checkpoint below)

After changing the visible synthetic score label to **Demo rating** (Filipino: **Markang demo**), TypeScript, Expo lint, full Jest (17 suites / 148 tests), and Expo Doctor (21/21) all passed. The score remains a synthetic fixture value and is disclosed as such in both UI language and accessibility text. No Android export or Gradle build was started: available RAM was 3.61 GB before checks and 3.28 GB afterward, both below the user's 6.5 GB build gate; C: went from 5.31 GB to 5.19 GB free, and D: remained 202.45 GB free. ADB returned no connected devices. The preserved requested APK remains 63,792,497 bytes with SHA-256 `6F94D1301CA52751881FF207B81EC0D0BBC848B4D14BAD0D161CDECFDFDDC669`; it does not include this source wording change or the other latest source-only changes. No JuanTrike-owned Gradle, Metro, emulator, or project-path process was found; unrelated Node processes were left running. Current-source device, visual, and manual map-tap acceptance remain **NOT VERIFIED**.

## Latest source validation and export — 2026-10-17

- TypeScript: PASS (`npm run typecheck`).
- ESLint: PASS (`npm run lint`, no issues).
- Jest: PASS, 18 suites / 152 tests (`npm test -- --runInBand`).
- Expo Doctor: PASS, 21/21 (`npx expo-doctor`).
- Android JavaScript export: PASS; Metro bundled 1,300 modules. HBC: `dist/export-android-v3-source-final-20261017/_expo/static/js/android/entry-f697761bdbbed47e198884d4d224eed0.hbc`, 3,333,360 bytes, SHA-256 `D53A49B0CF6C03571CE17A67F911FDDA1BA285C514AB07C6CCC86D43FB3A8B33`.

This export includes the latest source-only Driver queue correction and logo/UI changes; it is not an APK. The preserved presentation APK remains 63,792,497 bytes with SHA-256 `6F94D1301CA52751881FF207B81EC0D0BBC848B4D14BAD0D161CDECFDFDDC669` and does not contain these updates. No Gradle build or emulator launch was attempted: available RAM was 6.16 GB before export, fell to 5.02 GB during export, and recovered to 6.18 GB afterward, below the 6.5 GB build gate. C: had 5.14 GB free and D: 202.14 GB free after export. ADB listed no connected device. Latest-source launch, manual touchscreen map selection, route update, and visual comparison remain **NOT VERIFIED**.

### Resource/device recheck after source review — 2026-10-17

The current checkout still points to the source export and preserved APK described above. A fresh host check measured 5.83 GB available RAM, 5.14 GB free on C:, and 202.14 GB free on D:. ADB still lists no device. No Java, Gradle, emulator, QEMU, or project-path Node process was running; the lightweight ADB server was present. No new build or emulator was started because RAM remains below the 6.5 GB build gate and device acceptance is unavailable. The earlier 6.18 GB post-export reading is historical; this is the latest resource snapshot.

### Latest source refinement and export — 2026-10-17

Passenger pickup and destination controls now expose localized accessibility labels that announce the current place or the map-tap action, and expose selected/disabled state. This does not alter map hit testing or booking logic. Source verification after this change: TypeScript PASS, ESLint PASS, Jest PASS (18 suites / 154 tests), Expo Doctor PASS (21/21). The Android export completed with 1,300 modules. HBC: `dist/export-android-v3-source-a11y-20261017/_expo/static/js/android/entry-3621a1439ed7ad03f2d9ebbad0e3d6fa.hbc`, 3,333,541 bytes, SHA-256 `9763622EBB87EDCF681FD4766AC77FE8D5235BB60D436B7FECC5E525DCD466C3`.

After export, available RAM was 5.91 GB; C: had 5.13 GB free and D: 202.13 GB free. ADB listed no device. The preserved APK remains SHA-256 `6F94D1301CA52751881FF207B81EC0D0BBC848B4D14BAD0D161CDECFDFDDC669`; it predates this source and export. No Gradle build or device test was attempted because available RAM is below the 6.5 GB gate and no device is connected. Latest-source TalkBack behavior, touchscreen map selection, screenshots, and visual comparison remain **NOT VERIFIED**.

After the full 154-test rerun, available RAM was 6.06 GB, C: had 5.13 GB free, and D: had 202.13 GB free. ADB still listed no device. This is the latest resource check and remains below the 6.5 GB build gate.

### Latest resource and cache-path recheck — 2026-10-17

A fresh check measured 6.23 GB available RAM, 5.12 GB free on C:, and 202.13 GB free on D:. ADB listed no device. No JuanTrike Java, Gradle, emulator, or Node process was found. The largest visible working sets were ChatGPT (0.86 GB), Codex (0.56 GB), MsMpEng (0.42 GB), and Chrome (0.34 GB); all were left running. Gradle (`the D:-hosted Gradle cache`), npm (`the D:-hosted npm cache`), temp (`the D:-hosted temporary directory`), Expo (`the D:-hosted Expo cache`), Android SDK, AVD, JDK 17, and project build outputs are present on D:. `%USERPROFILE%\.expo` is a junction to the D: Expo cache. Validation/export commands explicitly set temp and npm cache paths on D:. No build was started because 6.23 GB remains below the 6.5 GB target.

### Current gate recheck — 2026-10-17

Current available RAM is 6.20 GB, C: free space is 5.12 GB, and D: free space is 202.13 GB. ADB lists no connected device. No project Java, Gradle, emulator, or Node process is present. Android build/device acceptance remains deferred because the conservative 6.5 GB RAM target is not met and there is no device. Do not force-close unrelated applications or start a build under this snapshot.

### Packaging strategy review — 2026-10-17

The current Expo SDK is `~57.0.30` (React Native `0.86.3`). The Android Gradle plugin is configured to use Expo CLI `export:embed` for the release bundle. Expo's SDK 57 local-release guidance uses the native Gradle release task; this project-specific task also owns JavaScript embedding, native assets, lint, packaging and signing. The separate `expo export --platform android` output is an HBC export artifact, not a documented drop-in replacement for Gradle's `index.android.bundle`. The existing generated Gradle bundle predates the latest accessibility source. Do not skip `createBundleReleaseJsAndAssets`, copy an HBC file into the APK, or skip release lint/signing tasks.

The least-work supported next attempt is one sequential Gradle release build targeting only the existing AOSP emulator ABI (`x86_64`): reuse the D:-hosted Gradle and Android SDK caches, JDK 17, existing native compilation outputs and lockfiles; set `--max-workers=1`, `--no-daemon`, and `-Dorg.gradle.parallel=false`; pass `-PreactNativeArchitectures=x86_64`; let the normal release task regenerate the bundle from the current source and complete all release checks. Stop the emulator and do not run it alongside Gradle. Do not rebuild the four ABIs for this emulator-only APK. This narrows native compilation but does not eliminate Metro or release lint.

No build was started in this checkpoint. The single x86_64 and multi-ABI history shows material resource pressure (the x86_64/ARM64 attempt was stopped at 3.96 GB available RAM during `lintVitalRelease`, before packaging); this is not evidence that lowering the 6.5 GB pre-build gate is safe. Current snapshot: available RAM 6.26 GB; C: free 5.13 GB; D: free 202.13 GB; ADB has no connected device; no Java, Gradle, emulator or QEMU process is running. Eight small Node processes were present (0.04–0.07 GB working set each) and were left untouched. The current process environment has `TEMP`/`TMP` on C:, so the next build shell must explicitly set both, plus Java temp, to the existing D:-hosted `D:\dev-cache` directories before invoking Gradle. The requested `dist\presentation\JuanTrike-Final-Presentation.apk` does not exist. Preserve the 6.5 GB gate; stop here until a later resource snapshot meets it. No repeated build attempt was made.

## Final Presentation APK build and runtime check — 2026-10-17

- Source checks recorded for this source: TypeScript PASS, ESLint PASS, Jest 18 suites / 154 tests PASS, Expo Doctor 21/21 PASS, Android JS export PASS (1,300 modules). No application source changed during packaging.
- Controlled build: JDK 17.0.20.1, existing D:-hosted Gradle cache, `--no-daemon --max-workers=1 --no-parallel -PreactNativeArchitectures=x86_64 :app:assembleRelease`. Standard Expo `createBundleReleaseJsAndAssets`, release lint, signing validation and APK packaging ran. Metro bundled 1,300 modules. Build succeeded in 4m55s (534 tasks; 64 executed, 470 up to date). Lowest sampled available RAM during Gradle was 5.03 GB; emulator was not running concurrently.
- Artifact: `dist/presentation/JuanTrike-Final-Presentation.apk`, 43,925,855 bytes; SHA-256 `826D93C0F19B57EE97561AFBEFECE727B4698E163C9F4197ADB0DC2D4A27DEAE`. Package `com.juantrike.uidemo`, versionCode 1, versionName 1.0.0, min SDK 24, target SDK 36. APK contains x86_64 native libraries only, as requested for this emulator build. APK Signature Scheme v2 verifies; signer is the project’s Android Debug certificate (SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`), not a production distribution key.
- Embedded `assets/index.android.bundle`: 2,774,380 bytes, SHA-256 `94000E296594D305BA633AEA6A100A96504C2A01DE004311FC6C512D374A984C`; byte-for-byte matches Gradle’s generated release bundle. Android resource table includes `drawable/assets_juantrikelogo`; decoded packaged logo pixels match `assets/juantrike-logo.png` at 1324×1188. The earlier verified APK remains unchanged at SHA-256 `6F94D1301CA52751881FF207B81EC0D0BBC848B4D14BAD0D161CDECFDFDDC669`.
- Runtime smoke: installed the requested APK on the Android 36 AOSP x86_64 emulator and cold-launched without Metro. Logcat recorded `ReactNativeJS: Running "main"`. The genuine capture `docs/screenshots/device/20261017-juantrike-final-presentation/welcome.png` shows an Android **“System UI isn’t responding”** dialog over Welcome. The emulator was gracefully stopped. The captured log excerpt contains no React Native fatal exception or detailed ANR trace; the screen is still a failed/unstable emulator acceptance session.
- Passenger/Driver journeys, direct map taps, OSM tile/route display, geofence cases, FIFO expiry, trip/history flows, offline fallback and reference-screen comparison were not completed on this artifact. Screenshots of Passenger Home, Driver Dashboard and Active Trip do not exist for it. Overall verdict remains **PARTIAL**; do not mark `CLIENT_PRESENTATION_READY`.

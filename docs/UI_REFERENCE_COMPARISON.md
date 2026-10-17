# JuanTrike Target UI Comparison

**Status: PARTIAL — the last built APK predates the map-tap and Active Trip layout source changes; no device is connected and visual acceptance is not established. Historical screenshot sets below remain tied to their original APK hashes.**
**Updated:** 2026-10-17

## Latest source-only checkpoint — 2026-10-17 (supersedes earlier source-only checkpoint below)

The owner-supplied illustrated JuanTrike artwork has been copied unchanged to `design-reference/juantrike-logo.png` (SHA-256 matches the supplied attachment) and a transparent display derivative is integrated through `BrandLogo` on Welcome, Passenger, and Driver screens. The approved composite UI reference remains a visual specification only; it is not rendered as a screen background. Native app-icon and splash assets remain unchanged because the supplied horizontal lockup is not yet adapted to a safe adaptive-icon/splash composition.

Passenger now has a centered image lockup, a floating location selector with pickup/destination swapping, and its larger Leaflet map remains behind the non-control overlay. Driver now has a compact logo/online header, product-facing trip/earnings/rating labels, an incoming map preview height of 132 dp, and a queue label that does not imply real passenger demand. These are source changes only. The Active Trip hierarchy uses the shared simulation state and current navigation map; completed state remains a separate shared-state presentation.

Source regression checks now exercise map-coordinate callback → pickup selection → destination selection → fare preview/eligible booking, and an out-of-coverage pickup remains non-bookable. Existing WebView message-bridge and `pointerEvents="box-none"` tests still cover their respective boundaries. These tests do not prove native WebView hit-testing or touchscreen behavior on Android.

Latest checks: TypeScript PASS, Expo lint PASS, Jest PASS (18 suites / 152 tests), Expo Doctor PASS (21/21). Pre-build checks were 6.57 GB and 6.51 GB available RAM. A guarded 4-ABI attempt stopped at 3.85 GB during CMake; a second ARM64/x86_64 attempt generated the Metro production Android bundle (1,300 modules; 2,775,000 bytes; SHA-256 `8B8261EBBEF5FBF574055A9C63E5D787CB18262F75826D08578ABB49552B58C8`), then was interrupted at 3.96 GB during release lint before APK packaging. After stopping, available RAM recovered to 6.48 GB; C: had 5.15 GB free, D: 202.16 GB free, and ADB listed no device. No current-source screenshot exists. The preserved APK remains `dist/presentation/JuanTrike-V3-Android-Presentation.apk`, SHA-256 `6F94D1301CA52751881FF207B81EC0D0BBC848B4D14BAD0D161CDECFDFDDC669`; it predates the current logo/layout/source changes. Current-source visual and Android acceptance remain **NOT VERIFIED** and the verdict remains **PARTIAL**.

## Current source change — map selection pass-through

Source inspection found that TODA coverage polygons were registered as interactive paths with a zone-marker click callback. Leaflet 1.9.4 path events bubble to the map by default; that callback could therefore overlap location selection and had no corresponding zone detail UI. Coverage polygons are now visual-only (`interactive:false`), allowing an intentional tap on the fill to reach the map-background handler. Pickup, destination, vehicle and terminal markers retain disabled click bubbling. A regression test covers the generated Leaflet configuration. At this map-tap-only validation point, TypeScript, ESLint, Expo Doctor (21/21), and Jest (17 suites / 147 tests) passed; the later Active Trip layout test brings the current total to 148.

The current source additionally replaces the Driver summary's TODA/body-number tile with a synthetic fixture rating, and reorders Active Trip to show route stages, a larger map, ETA/distance tiles, and driver identity. Regression tests cover the rating tile and Active Trip order; TypeScript, ESLint, Expo Doctor 21/21, and Jest 17 suites / 148 tests pass. One constrained APK build attempt stopped during Metro bundling at 1.84 GB available RAM; no new APK or screenshot resulted. The latest APK remains SHA-256 `6F94D1301CA52751881FF207B81EC0D0BBC848B4D14BAD0D161CDECFDFDDC669` and predates these changes. ADB reports `DEVICE_NOT_CONNECTED`; manual Android map taps remain unverified. Previous genuine screenshots remain valid only for their documented older hashes. Visual match is still partial. Leaflet event option reference: [Leaflet API reference](https://leafletjs.com/reference.html).

## Android stall investigation — 2026-10-17

The latest host recheck after stopping the source build has 4.30 GB available RAM, C: has 7.04 GB free and D: has 202.45 GB free. The API 36 AOSP emulator is stopped; host ADB responds but lists no attached device. The prior controlled boot reduced host-available RAM from about 4.3 GB to 2.17 GB before opening the app. Its emulator log also records a Windows `UpdateLayeredWindowIndirect` failure after the software-OpenGL fallback to AMD host rendering. This points to host resource/window-rendering trouble, but does not identify why the first screenshot/activity calls stalled. There is no latest-artifact guest logcat, bugreport, WebView renderer trace or app ANR record. Therefore the stall is not attributed to JuanTrike, and latest APK launch and visual comparison remain **NOT VERIFIED**. Emulator retry is deferred until there is enough host memory headroom or an attached physical device.

## Latest visual/map implementation pass

The latest source pass enlarges the Passenger Leaflet viewport, makes the floating location selector pass touches through on its non-control areas, removes a duplicate map route badge, shows TODA-A as the default green coverage shape, reduces endpoint/vehicle/terminal marker dimensions, and uses a static zoom 13 startup view. It does not animate a route midpoint or change the pickup/destination/city coordinates. The Driver incoming offer spacing was tightened and the active-trip preview map was enlarged. Bridge tests now cover Leaflet background coordinate messages and marker messages; the Passenger overlay test covers its `box-none` hit-test contract.

Latest APK: `dist/presentation/JuanTrike-V3-Android-Presentation.apk`, 63,792,497 bytes, SHA-256 `6F94D1301CA52751881FF207B81EC0D0BBC848B4D14BAD0D161CDECFDFDDC669`; v2 signing verified with the local Android debug certificate; ARM64 and x86_64; embedded JS bundle 2,773,568 bytes. The exact prior APK was preserved as `dist/presentation/JuanTrike-V3-Android-Presentation-pre-visual-map-20261017.apk` at SHA-256 `746FD51AC8A20E36BB0839C4B8BDA656C79009EDC2C86F3C656AEA2ABC8D6D1B`. Build log: `build-logs/gradle-v3-visual-map-20261017.log`.

The install command reported `Success` on `JuanTrike_API36_AOSP_X86_64`; the `monkey` launch was dispatched and the package process was observed. However, ADB screencap and later shell/activity requests stalled, the emulator window became nonresponsive, and available RAM fell below 2 GB. A graceful close did not complete; only this test emulator process was then terminated to protect host stability. No usable screenshot from this newest APK was captured, and the resumed Activity/UI is **NOT VERIFIED**. A second visible, no-snapshot boot with a 1.5 GB emulator memory override was stopped before app launch when host RAM reached 2.17 GB; after emulator shutdown, available RAM recovered to 4.3 GB. The attempted-evidence folder is `screenshots/device/20261017-juantrike-v3-visual-map-acceptance/`; it contains no accepted screenshot set. This device work does not establish a JuanTrike app ANR or a pass.

The project-owned logo remains a green pin containing a small white tricycle (`assets/android-icon-foreground.png`) combined with native text in `src/components/BrandLockup.tsx`. The reference’s colorful city/tricycle/pin illustration is not present among the project assets; that source artwork is a remaining requirement for close brand fidelity.

The needed supplied asset is a separately usable, approved illustrated JuanTrike lockup with the colorful tricycle/city/orange-pin artwork and wordmark (transparent high-resolution PNG or vector SVG preferred). The composite presentation reference is not used as an app background or cropped to fabricate the logo.

## Reference

- Primary visual specification: [`design-reference/juantrike-target-ui.png`](../design-reference/juantrike-target-ui.png).
- The image was opened and visually inspected before editing the interface. It is a composed Passenger, Driver, and Active Trip presentation; it is not used as an app background.

## Preserved stable V3 baseline comparison

| Reference element | Stable V3 evidence | Assessment |
| --- | --- | --- |
| Passenger logo, identity, route card, fare/ETA and booking action | [`v3-final-passenger-locations.png`](screenshots/device/20261017-juantrike-v3-final/v3-final-passenger-locations.png) | Brand colors, rounded selection card, fare/ETA summary, booking action, and OpenStreetMap attribution are present. The header/selection card are larger and the layout is more vertically stacked than the reference. |
| Angeles City map, coverage polygon, route and markers | Same passenger screenshot; [`v3-final-outside-coverage.png`](screenshots/device/20261017-juantrike-v3-final/v3-final-outside-coverage.png) | Live OSM tiles and route/coverage layers render. The stable camera frames most of the city; it is broader than the street-level crop in the reference, and the visible boundary styling differs from the reference’s filled green service area. |
| Driver branding, online state, FIFO offer, countdown and actions | [`v3-final-driver-offer-2.png`](screenshots/device/20261017-juantrike-v3-final/v3-final-driver-offer-2.png), [`v3-final-accepted-approach.png`](screenshots/device/20261017-juantrike-v3-final/v3-final-accepted-approach.png) | Timed offer and Accept/Decline are functional, with the passenger identity and map preview. The offer/dashboard layout is much more card-heavy and taller than the reference. |
| Active trip progress, identity, vehicle and completion | [`v3-final-trip-started.png`](screenshots/device/20261017-juantrike-v3-final/v3-final-trip-started.png), [`v3-final-trip-completed.png`](screenshots/device/20261017-juantrike-v3-final/v3-final-trip-completed.png) | The lifecycle and trip controls render and work. The current trip card does not yet match the compact reference hierarchy or map crop. |
| History and negative coverage/GPS/offline states | [`v3-final-passenger-history.png`](screenshots/device/20261017-juantrike-v3-final/v3-final-passenger-history.png), [`v3-final-gps-denial-result.png`](screenshots/device/20261017-juantrike-v3-final/v3-final-gps-denial-result.png), [`v3-final-offline.png`](screenshots/device/20261017-juantrike-v3-final/v3-final-offline.png) | Genuine emulator captures; history and GPS denial are visible. Offline fallback is partial: the unavailable-tiles notice is partly covered by the floating route card and cached tile imagery remains in the capture. |

These are genuine ADB screenshots from the preserved pre-camera V3 APK with SHA-256 `056DE18BF99EEBDF4ABC4B5D5FD509167C9BBC4755B18C54DED9AA0DA929DC25`. They include one seeded journey and selected negative observations. They are separate from both the earlier V1 baseline and the current-source candidate evidence below.

## Previous polygon-refinement V3 candidate — historical evidence

At the time, this was the requested artifact at `dist/presentation/JuanTrike-V3-Android-Presentation.apk`, SHA-256 `746FD51AC8A20E36BB0839C4B8BDA656C79009EDC2C86F3C656AEA2ABC8D6D1B`, 63,792,317 bytes. It has since been preserved at `dist/presentation/JuanTrike-V3-Android-Presentation-pre-visual-map-20261017.apk`; the latest artifact/hash and device attempt are recorded above. It was built from the then-current source with JDK 17, one Gradle worker and `arm64-v8a,x86_64`; the embedded JavaScript and APK v2 signature were verified. Its installed `base.apk` matched that historical hash. The build log is `build-logs/gradle-v3-polygon-refinement-20261017.log`.

Genuine captures from that installed APK are in [`20261017-juantrike-v3-polygon-refinement`](screenshots/device/20261017-juantrike-v3-polygon-refinement/). They include Welcome, Passenger with live OSM, sample request/offer, outside-coverage denial, FIFO decline and offer-expiry sequence, driver approach, trip start/completion, Passenger and Driver histories, pause/resume, reset during an active offer, GPS denial, and offline fallback. `reset-active-before.png` shows a live booking request; `reset-active-after.png` and its UIAutomator dump show `Driver Dashboard` / `No active trip`. `gps-denied.png` shows the Android denial fallback. `offline.png` and `offline.xml` show “Offline — live map tiles unavailable.” Connectivity was restored, and the emulator was shut down through ADB.

Compared with the prior baseline, TODA-A now uses an angular synthetic polygon and its fill appears in the current candidate's route/map captures. OSM tiles, route geometry, pickup/destination pins, fare and estimate content are visible. The app remains materially different from the reference: the brand is a native mark and wordmark instead of the illustrated lockup; Passenger content is more vertically stacked and card-heavy; the map crop and route framing differ; Driver offer/queue and Active Trip use larger, denser cards and a different hierarchy. Current device evidence uses presentation-seeded locations; manual map-tap selection was not conclusively verified. Therefore the reference is not yet a close visual match.

## Superseded intermediate camera-refinement candidate

The earlier intermediate APK SHA `71C2390D81FC481E9F9E66C1CACCB5DFADD00B9C5612169B55DD3E1BB33E7B3D` was replaced at the requested artifact path by the final polygon-refinement artifact above. Its smoke captures remain in [`20261017-juantrike-v3-camera-refinement-final`](screenshots/device/20261017-juantrike-v3-camera-refinement-final/) and are not evidence for the final artifact.

The passenger screenshot confirms detailed OSM tiles, attribution and the Angeles City geometry render at the revised camera; the driver screenshot confirms the role screen opens and shows the same map context. Visual differences remain substantial: the branding is a simple mark/wordmark, Passenger selection and fare content occupy oversized vertical cards, the service geometry is an outline/synthetic rectangle rather than the reference's filled green polygon, and Driver/Active Trip hierarchy does not reproduce the compact presentation. Candidate map pins/routes are not demonstrated in these empty-state screenshots. The prior pre-camera artifact remains preserved at `dist/presentation/JuanTrike-V3-Android-Presentation-pre-route-camera-change-20261017.apk` with its original SHA.

## Camera-focus experiment (not accepted)

A small route-midpoint focus was implemented to tighten the OSM crop. The rebuilt APK loaded the focused passenger map, but a later tap at the map-controls area was followed by an Android input-dispatch ANR in `com.juantrike.uidemo`; the app process was killed and Android surfaced `org.chromium.webview_shell`. Because this stability regression was not cleared, that camera change was reverted. Its APK and diagnostic captures are preserved separately under `dist/presentation/JuanTrike-V3-Android-Presentation-mapfocus-anr-investigation-20261017.apk` and `docs/screenshots/device/20261017-juantrike-v3-mapfocus-anr-investigation/`; they are not the presentation artifact or acceptance evidence.

## Automated and artifact evidence

- Jest: PASS, 17 suites / 145 tests (`npx jest --runInBand`); freshly rerun after final source changes. Log: `build-logs/source-checks-v3-final-20261017.log`.
- TypeScript and ESLint: PASS (`npx tsc --noEmit`, `npx expo lint`); freshly rerun.
- Expo Doctor: PASS, 21/21; freshly rerun.
- Final Android JS export: PASS, Metro bundled 1,299 modules; HBC 3,332,513 bytes, SHA-256 `963C1B3045B45E9281B60E93715BDFE497417FA28B7457320F01C0927D3EFD22`; output `dist/export-android-v3-polygon-refinement-20261017/`.
- Preserved stable V3 baseline APK: 63,792,029 bytes; SHA-256 `056DE18BF99EEBDF4ABC4B5D5FD509167C9BBC4755B18C54DED9AA0DA929DC25`; its journey evidence is scoped to that artifact.
- Final polygon-refinement APK: 63,792,317 bytes; package `com.juantrike.uidemo` v1.0.0, min SDK 24 / target 36; v2 signature verified; ARM64 and x86_64; embedded JS bundle 2,773,388 bytes. SHA-256 `746FD51AC8A20E36BB0839C4B8BDA656C79009EDC2C86F3C656AEA2ABC8D6D1B`.

## Remaining visual acceptance

The final candidate adds a filled angular synthetic coverage zone and has current-artifact journey/negative evidence, but the logo artwork, map crop, Passenger proportions, Driver density and Active Trip composition still differ materially. Manual map-tap endpoint selection remains unverified on-device. The map-focus diagnostic ANR is a separate rejected experiment and must not be attributed to the final candidate. Keep the verdict **PARTIAL** until the visual match is close and all remaining acceptance is demonstrated on the same artifact.

## Earlier source-only checkpoint — 2026-10-17 (superseded by the latest checkpoint below)

The latest source changes have no corresponding APK or genuine screenshots. The Driver summary label now reads **Demo rating** / **Markang demo** to disclose that its 4.9 value is synthetic. Automated source checks passed (TypeScript, Expo lint, 17 Jest suites / 148 tests, Expo Doctor 21/21), but they do not prove visual match or touchscreen behavior. The current source has not been compared side by side on Android; preserve the prior screenshot sets as historical evidence for their recorded APK hashes. The colorful illustrated reference lockup is still missing from project-owned artwork. Available RAM was 3.61 GB before checks and 3.28 GB after, below the 6.5 GB build gate; ADB had no device, so no export/build was attempted. Visual acceptance remains **NOT VERIFIED**.

## Source and export checkpoint — 2026-10-17

The illustrated, project-owned logo is now available at `assets/juantrike-logo.png` and used by the Welcome, Passenger, and Driver screens. The Driver screen now presents a truthful empty **Ride queue** state instead of displaying static candidate-driver fixtures as if they were passenger requests; FIFO dispatch remains in the booking state machine. Source validation passes, and the Android JS export was regenerated from this source. No APK was rebuilt and no new Android screenshots exist, so the updated source has not been compared side by side on-device. Historical screenshots remain scoped to their documented APK hashes. Visual acceptance remains **NOT VERIFIED** and the overall result **PARTIAL**.

## Latest source refinement — 2026-10-17

Passenger location rows now announce their label, current place or map-tap instruction, and selected/disabled state to accessibility services. TypeScript, ESLint, 18 Jest suites / 153 tests, Expo Doctor 21/21, and a fresh 1,300-module Android JS export pass. This remains source-level evidence only: there is no rebuilt APK or new Android screenshot to compare against the reference. Keep visual and touchscreen acceptance **NOT VERIFIED**.

The final source-test rerun passed 18 suites / 154 tests, including booking-locked accessibility state. Available RAM afterward was 6.06 GB, below the 6.5 GB Gradle gate, and ADB had no device. The new bundle has not been installed or visually captured; visual acceptance remains **NOT VERIFIED**.

## Final Presentation APK runtime comparison — 2026-10-17

The x86_64 final APK built successfully and cold-launched offline from Metro on the Android 36 AOSP emulator. The only genuine new capture is `docs/screenshots/device/20261017-juantrike-final-presentation/welcome.png`; it is obscured by an Android “System UI isn’t responding” dialog. No clean Passenger, Driver, or Active Trip capture was obtained, so a direct visual comparison with `design-reference/juantrike-target-ui.png` could not be completed. Map taps, OSM/route rendering, booking and trip scenarios remain unverified on this artifact. Keep visual/runtime acceptance **NOT VERIFIED** and verdict **PARTIAL**.

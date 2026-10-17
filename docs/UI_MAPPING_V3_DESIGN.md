# JuanTrike UI Mapping V3 Design

## Earlier visual/map acceptance checkpoint — 2026-10-17 (superseded by the source refinement checkpoint below)

At the time of this earlier checkpoint, the source pass used a taller Passenger Leaflet view, smaller proportional map markers, a visible default TODA-A green fill, a static zoom 13 startup frame, and pass-through touch handling for non-control portions of the floating location selector. Driver incoming-card spacing was reduced and the active-trip preview map was enlarged. Endpoint and jurisdiction coordinates were preserved; no animated camera recenter was introduced. Jest verifies the WebView tap/marker message bridge and overlay pointer-event contract, but these tests are not device touch evidence.

The prior-source standalone APK built and installed successfully, but the Android 36 AOSP emulator became nonresponsive during screenshot/activity capture. A visible 1.5 GB clean-boot retry was stopped before app launch when host RAM reached 2.17 GB. The source-only map and Active Trip changes did not have an APK or device screenshots at that time. The supplied illustrated logo was not yet integrated at that earlier checkpoint; it is now used by the shared `BrandLockup`, as recorded below. Current-source visual and manual map selection acceptance remain **NOT VERIFIED**. See `UI_REFERENCE_COMPARISON.md` and `ANDROID_ACCEPTANCE_RESULTS.md` for artifact hashes and evidence boundaries. Verdict remains **PARTIAL**.

The follow-up diagnosis found no running emulator or attached device, and a retry log containing a Windows `UpdateLayeredWindowIndirect` composition failure after graphics fallback. The retry boot consumed about 2.1 GB of host-available RAM before app launch. No latest-artifact guest logcat, bugreport, WebView renderer or ActivityManager dump was retained, so the cause of the original ADB screenshot stall remains unresolved and is not attributed to the app. A new device run is deferred until a physical device is available or host RAM can absorb the measured emulator cost with at least 4 GB remaining.

After the source review, TODA polygons were changed to visual-only Leaflet paths so map taps within the synthetic coverage reach the underlying location-selection handler. Endpoint/vehicle/terminal marker event bubbling remains disabled. This is covered by a generated-map-source regression test and the full suite, but is not Android touch evidence. The current APK predates this source change; it must be rebuilt and tested before presentation acceptance. No camera behavior or coordinates changed.

The current source also uses a synthetic profile rating in the Driver summary in place of the TODA/body-number tile, and orders Active Trip content as status, trip stages, the larger navigation map, ETA/distance tiles, then driver identity. This improves alignment with the reference while retaining the shared trip simulation and route layers. DriverScreen tests cover both UI points; the current APK and screenshots do not include these source-only adjustments. A D:-hosted Release attempt was stopped during Metro bundling at 1.84 GB available RAM; no current-source APK was produced. Device visual and manual map-tap acceptance remain unverified.

**Product status:** client presentation build, local and synthetic demo data only.

**Primary visual reference:** [`design-reference/juantrike-target-ui.png`](../design-reference/juantrike-target-ui.png), copied from the owner-supplied image and verified against the attachment before UI edits. It specifies the passenger screen, driver offer dashboard, and active-trip presentation.

## Experience goals

- Keep the map visible as the main shared surface for pickup, destination, driver, terminal, coverage, and route context.
- Use a recognizable JuanTrike green identity with blue map/navigation accents and readable high-contrast controls.
- Let a presenter switch between passenger and driver views and control demo time without rebuilding the map on each simulated tick.
- Label network tiles, mapped city coverage, synthetic TODA zones, simulated vehicles, and illustrative routes so the demo does not imply official operations.
- Keep passenger and driver tasks reachable as Expo Router routes: `/`, `/passenger`, `/driver`, and `/demo-panel`.

## Visual system

The native screens use the shared tokens in `src/theme/tokens.ts`. Green identifies the JuanTrike brand and valid booking actions; blue identifies navigation and selected map context; amber identifies destination or attention; red identifies blocked or cancel actions. `BrandLockup` combines the project-owned JuanTrike foreground artwork with native text and controls. The generated launcher/splash assets use the same green-and-white mark. Welcome and both role screens expose an accessible **About this app** action with clear prototype, estimate, location, and coverage disclosures.

The reference uses a white canvas, centered JuanTrike branding, green primary actions, floating rounded cards, an Angeles City map, and compact route/fare information. The passenger screen implements the floating pickup/destination card over the interactive map, map actions, vehicle/fare summary, ETA/distance tiles, and booking action. The driver screen prioritizes online status, estimated-fare/trip summary, passenger-named incoming offer and countdown, route preview, accept/decline controls, and FIFO queue. Active-trip progress, route, driver identity, and completion state use the same visual language. Product-facing labels avoid developer demo jargon; the About content retains honest prototype limitations. These are native React Native components connected to existing app state; the reference is not used as a screen background.

The supplied image is a composed multi-device presentation, so its exact pixel dimensions do not map to an Android viewport. The final polygon-refinement V3 candidate was captured and visually compared on Android 36. The current artifact renders an angular, filled synthetic TODA-A polygon, detailed OSM, route and marker content, compact sample booking information, and role-specific screens. Its artwork, map framing, Passenger proportions, Driver offer density and Active Trip hierarchy still differ materially from the reference. The current candidate's seeded lifecycle and negative scenarios are separately evidenced from the prior baseline. Direct map-tap endpoint selection remains unverified. A separate route-midpoint camera experiment produced an Android WebView-host ANR and is not this candidate. See [the comparison record](UI_REFERENCE_COMPARISON.md).

## Screen map

| Route | User task | Primary content |
| --- | --- | --- |
| `/` | Choose a demo role | Brand lockup, language toggle, passenger and driver entry points |
| `/passenger` | Set locations and request a ride | Shared map, pickup/destination controls, city/TODA eligibility, route and fare preview, booking state |
| `/driver` | Review and respond to an offer | Shared map, driver position, pickup/destination route, offer card, accept/decline and trip states |
| `/demo-panel` | Present or reset a scenario | Language, role, simulated clock speed, pause/resume, example booking, reset and offline controls |

`src/app/_layout.tsx` owns the Expo Router stack and shared `DemoProvider`. Non-route UI remains outside `src/app/`.

## Shared map

`InteractiveMap` hosts the locally bundled Leaflet engine in a WebView. Map state is pushed into the existing page for marker, focus, route, and coverage updates rather than rebuilding its HTML on every tick. It combines Expo Network's native connection state with the WebView online event so Android airplane mode can be reported even where `navigator.onLine` remains true. The map can show pickup and destination pins, current GPS, simulated vehicle and terminals, synthetic TODA zones, a distinct Angeles City boundary, route layers, selection, and fit/follow camera state.

Street tiles are requested on demand from OpenStreetMap while connected. The map includes visible OpenStreetMap attribution and the geoBoundaries boundary source. The final candidate uses a detailed downtown camera while retaining the city boundary; sample-route captures show the synthetic angular TODA-A fill, route and pickup/destination pins. This still does not reproduce the reference's crop and route hierarchy. With emulator Wi-Fi and mobile data disabled, the final candidate showed “Offline — live map tiles unavailable”; locally bundled route, marker and coverage geometry remains available. If Leaflet itself cannot load, the SVG fallback draws the demo layers without network tiles. Tile availability is best-effort; OSM street tiles are not bundled for offline use.

## Passenger and driver states

Passenger states guide the user from role selection through pickup/destination selection, eligibility, route/fare preview, request, driver search, offer, and trip completion. Location and route checks are explicit: both endpoints must sit inside the mapped city and synthetic demo coverage, and every sampled point on the displayed route must remain in the city geometry.

Driver states show the same booking from the driver side. Offers are synthetic, can be accepted or declined, and the simulated vehicle follows the same route geometry and demo clock as the booking state machine. The driver screen labels simulator GPS and flags a point or route outside the mapped city outline.

English and Filipino strings live in `src/i18n/strings.ts`. Shared buttons, cards, badges, and text styles live in `src/components/Ui.tsx`. Welcome feature descriptions wrap to multiple lines instead of truncating. Driver accept/decline, approach, arrival, trip start/completion, and return-to-queue actions use a pinned bottom action area outside the scrollable details. Keep touch targets comfortable and avoid high-frequency React/WebView reconstruction.

## Boundaries and data labels

- **Mapped city outline:** a simplified 2020 geoBoundaries PHL ADM3 feature for Angeles City. It is indicative mapping, not a legal determination.
- **Synthetic TODA zones and drivers:** the demo uses a fictional angular TODA-A polygon and separate demo zones/profiles. They do not represent an LGU/TODA roster, boundary, dispatch, or permit.
- **Road graph:** a local OpenStreetMap crop used for demo route geometry. It is not a validated tricycle routing profile or a claim that a vehicle may use each road.
- **GPS:** one-shot foreground reads only. Emulator fixes are marked simulated; cached fixes are labeled last-known.
- **Fare:** a demo estimate. No payment or real booking is created.

See [geofencing](ANGELES_CITY_GEOFENCING.md), [GPS modes](GPS_AND_LOCATION_MODES.md), [routing](ROAD_ROUTING_ENGINE.md), and [driver navigation](DRIVER_NAVIGATION.md) for implementation details.

The four requested staff roles are documented separately in [role-based presentation UI concepts](ROLE_BASED_PRESENTATION_UI.md). They are not additional Android routes or evidence of connected administration services.

## Previous polygon-refinement verification — historical

The prior polygon-refinement artifact on 2026-10-17 passed TypeScript, ESLint, Jest (17 suites / 145 tests) and Expo Doctor (21/21); its Android JS export bundled 1,299 modules. APK SHA-256 `746FD51AC8A20E36BB0839C4B8BDA656C79009EDC2C86F3C656AEA2ABC8D6D1B` was built with JDK 17, one Gradle worker and ARM64/x86_64; its v2 signature, embedded JS and installed-byte identity were verified. Historical device evidence for that artifact covers standalone launch, OSM, seeded passenger/driver lifecycle, FIFO decline and three expirations, histories, pause/resume, reset during an active offer, GPS denial and offline fallback. Manual map-tap selection was not verified, and visual comparison remained incomplete. The latest visual/map artifact and emulator attempt are summarized above and in [Android acceptance results](ANDROID_ACCEPTANCE_RESULTS.md) and [reference comparison](UI_REFERENCE_COMPARISON.md).
# Visual/map acceptance pass — 2026-10-17

## Latest source-only continuation — 2026-10-17

The owner-supplied logo was copied unchanged to `design-reference/juantrike-logo.png`; its SHA-256 matches the supplied image. A transparent display derivative is now integrated through `BrandLogo` in Welcome, Passenger, and Driver. Earlier statements in this document saying the illustrated logo was missing describe the preceding source checkpoint and are superseded for source integration. App-icon and splash artwork have not been changed because the lockup still needs a platform-safe square/mask composition.

Passenger’s source adds a compact location swap action and test-double coverage from map callback through endpoint state, fare/route preview, and geofence-based booking eligibility. A second callback test confirms that an out-of-coverage endpoint cannot be booked. Leaflet HTML bridge and non-interactive TODA polygon tests remain separate; actual Android touch delivery is still unverified. Driver source uses the supplied mark, a compact online header, a shorter incoming map preview, and non-misleading summary/queue labels.

TypeScript, Expo lint, Jest (18 suites / 152 tests), and Expo Doctor (21/21) pass for the latest source. Pre-build RAM checks were 6.57 GB and 6.51 GB. The 4-ABI build attempt stopped at 3.85 GB during CMake. A second ARM64/x86_64 attempt produced the embedded Android bundle (1,300 modules; 2,775,000 bytes; SHA-256 `8B8261EBBEF5FBF574055A9C63E5D787CB18262F75826D08578ABB49552B58C8`) but was stopped at 3.96 GB during release lint, before APK packaging. RAM recovered to 6.48 GB afterward; C: had 5.15 GB free, D: 202.16 GB free, and ADB was empty. No emulator launch or current-source screenshot was attempted. The preserved APK SHA remains `6F94D1301CA52751881FF207B81EC0D0BBC848B4D14BAD0D161CDECFDFDDC669` and predates these changes. There are no genuine screenshots from the current source. Visual and Android acceptance remain **NOT VERIFIED**; status **PARTIAL**.

The earlier source pass used a taller Passenger Leaflet view, smaller proportional map markers, a visible default TODA-A green fill, a static zoom 13 startup frame, and pass-through touch handling for non-control portions of the floating location selector. Driver incoming-card spacing was reduced and the active-trip preview map was enlarged. Endpoint and jurisdiction coordinates were preserved; no animated camera recenter was introduced. Jest verifies the WebView tap/marker message bridge and overlay pointer-event contract, but these tests are not device touch evidence.

The earlier standalone APK built and installed successfully, but the Android 36 AOSP emulator became nonresponsive during screenshot/activity capture. Latest-device visual and manual map selection acceptance remain **NOT VERIFIED**. The supplied illustrated logo was not integrated at that time; current source integration is recorded in the source refinement checkpoint below. See `UI_REFERENCE_COMPARISON.md` and `ANDROID_ACCEPTANCE_RESULTS.md` for artifact hashes and evidence boundaries. Verdict remains **PARTIAL**.


The visible score label is now **Demo rating** / **Markang demo** so the synthetic profile value cannot be mistaken for verified driver reputation. Fresh checks pass: TypeScript, Expo lint, Jest (17 suites / 148 tests), and Expo Doctor (21/21). On 2026-10-17, available RAM was 3.61 GB before and 3.28 GB after these checks, below the 6.5 GB build gate; ADB had no connected device. No export or build was attempted, and the preserved APK hash remains `6F94D1301CA52751881FF207B81EC0D0BBC848B4D14BAD0D161CDECFDFDDC669`. The source-level map-tap bridge/polygon tests remain automated evidence only; pickup/destination selection and route preview after physical touchscreen taps are still not verified on the current source artifact.

## Source refinement checkpoint — 2026-10-17

The current source uses `assets/juantrike-logo.png`, the supplied illustrated JuanTrike logo, in the shared `BrandLockup` on Welcome, Passenger, and Driver. Driver summary labels identify estimated earnings and demo rating. The Driver queue now displays **Ride queue** with a localized empty state; synthetic candidate drivers remain part of FIFO dispatch logic and are not rendered as queued passenger bookings. This change preserves the booking state machine.

Automated validation passes (TypeScript, ESLint, 18 Jest suites / 152 tests, Expo Doctor 21/21), and the standalone Android JS export completed with 1,300 modules. Map callback/geofence behavior is covered by tests, but bridge tests do not prove Android touchscreen delivery or absence of WebView interception. The exported JS is not an installable APK. No fresh Android screenshot, manual map interaction, or current-source device journey has been captured. Keep visual/device acceptance **NOT VERIFIED** and overall status **PARTIAL** until a rebuilt APK is installed and checked.

Passenger pickup and destination rows now provide localized screen-reader labels for their current place or map selection action, plus selected/disabled state. Fresh source gates pass: TypeScript, ESLint, Jest (18 suites / 154 tests), Expo Doctor (21/21), and Android JS export (1,300 modules; SHA-256 `9763622EBB87EDCF681FD4766AC77FE8D5235BB60D436B7FECC5E525DCD466C`). This refinement does not verify native Android accessibility output or touchscreen map delivery. No current-source APK/screenshots exist; visual and device acceptance remain **NOT VERIFIED**.

The locked-state accessibility test passed as part of the 18-suite / 154-test full run. No APK or screenshot was produced from the updated source. Latest resource check is 6.06 GB available RAM with no connected device, so device and visual acceptance remain **NOT VERIFIED**.

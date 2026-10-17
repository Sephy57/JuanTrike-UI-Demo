# JuanTrike — UI mapping v2 test results

Branch `feature/ui-mapping-v2`. Environment: Windows 11, Node 24.21.0, Expo SDK 57
(`expo ~57.0.28`, `react-native 0.86.3`, `react 19.2.3`).

Every row below is a check that was actually run in this environment. Nothing is
marked PASS on the strength of intent.

## Summary

| Check | Status | Evidence |
|---|---|---|
| TypeScript (`npx tsc --noEmit`) | **PASS** | Clean, 0 errors, after all v2 edits |
| Lint (`npx expo lint`) | **PASS** | 0 errors, 0 warnings |
| Unit tests (`npx jest`) | **PASS** | 8 suites, **97 tests**, all passing |
| — of which pre-existing | PASS | 64 tests in 6 suites, preserved from the baseline |
| — added in v2 | PASS | 33 tests in 2 new suites (`router`, `routeLayers`) plus geometry additions |
| Road graph extraction (`JT_FETCH=0`) | **PASS** | Deterministic rebuild from `tools/cache/osm-tiles.json`, 9,458 nodes / 11,892 edges |
| Leaflet bundling (`node tools/bundle-leaflet.mjs`) | **PASS** | Wrote `src/map/leafletAssets.ts`, 162.4 KiB |
| Android JS bundle (`expo export --platform android`) | **PASS** | `Android Bundled 15613ms index.ts (628 modules)` → `index-8d912293891ea1368e6076302def8525.hbc`, 2.1 MB, exit 0 |
| Road route follows streets | **PASS** (unit) | Trip 1.845 km over 45 points vs 1.456 km straight line; longest segment 174 m |
| Off-network fallback is labelled | **PASS** (unit) | Pickup → outside-coverage point returns `source: 'illustrative'` |
| Approach route | **PASS** (unit) | 18 points, 0.505 km, `road-network` |
| Route split keeps halves joined | **PASS** (unit) | Traveled tail === remaining head at t = 0.25 / 0.4 / 0.5 |
| Layer set matches booking status | **PASS** (unit) | Preview → approach → travelled+remaining(trip) transitions asserted |
| Context split (`useDemoState` / `useDemoControls`) | **PASS** | `demoContext.test.tsx` still green through the merged `useDemo()` |
| Emulator / device UI | **BLOCKED** | `adb devices` returns an empty list — no device or emulator attached |
| Maestro flows (`maestro/flows/*.yaml`) | **BLOCKED** | Same: no device. The flows' verbatim string assertions are listed below |
| Native Android build | **NOT RUN** | Not attempted; JDK and SDK are present but no build was requested |
| `expo-doctor` | **PARTIAL** | 20/21. The one failure is pre-existing and unrelated — see below |
| GitHub release / publish | **NOT ATTEMPTED** | Explicitly requires separate approval |

## Baseline comparison

Recorded on the same branch before any v2 work, clean tree from `main` @ `4ffb8f3`:

| | Baseline | Now |
|---|---|---|
| `npx tsc --noEmit` | 0 errors | 0 errors |
| `npx expo lint` | 0 problems | 0 problems |
| `npx jest` | 6 suites / 64 tests | 8 suites / 97 tests |

The original 64 tests are unchanged and still pass. No test was deleted, skipped
or weakened; `__tests__/dispatch.test.ts` still asserts the original
`simulatedRoute()` behaviour, which was kept intact.

## Route quality evidence

Measured through the test suite against the bundled demo coordinates:

| Route | Source | Points | Distance | Longest segment | Endpoint snap |
|---|---|---|---|---|---|
| Trip (pickup → destination) | `road-network` | 45 | 1.845 km | 174 m | 28 m |
| Straight-line (v1 behaviour) | — | 3 | 1.456 km | — | — |
| Approach (driver start → pickup) | `road-network` | 18 | 0.505 km | 85 m | 28 m |
| Pickup → outside-coverage point | `illustrative` | 3 | — | — | > bbox |

Graph: 9,458 nodes, 11,892 edges, 694.5 km, bbox `[120.57, 15.11, 120.622, 15.182]`,
`MAX_SNAP_M = 400`.

## UI strings the Maestro flows assert verbatim

These must not change. They are all still present with identical text:

- `Welcome to JuanTrike`, `Passenger Mode`, `Driver Mode`
- `Tap the map to set pickup`, `Loading map…`, `Demo controls`, `Restore demo locations`
- `Confirm DEMO booking`, `Booking in progress — map locked`
- `Incoming DEMO booking`, `Accept`, `Start toward pickup`, `Arrived at pickup`,
  `Start trip`, `Trip completed`, `Trip history`, `Close`, `Return to queue`
- `Outside demo coverage — not bookable`
- `DEMO fare (synthetic)`, `Mang Ben · 1.42 km`, `DEMO Pickup A → DEMO Destination B`

Invariants the flows depend on:

- `DEMO_PICKUP_COORDS` (15.1466, 120.5879) and `DEMO_DESTINATION_COORDS`
  (15.1372, 120.5968) are unchanged, so history still reads **1.42 km**.
- `booking.distanceKm` is still the straight-line haversine used for fare and
  history. The road distance is presented separately in the navigation panel and
  never replaces the fare basis.
- The map chip shows the lock message, not the tap message, while a booking runs.

## `expo-doctor` finding (pre-existing)

```
✖ Check that packages match versions required by installed Expo SDK
❗ @types/jest  expected 29.5.14  found 30.0.0
```

`package.json` has no diff on this branch — `@types/jest@^30.0.0` came from
`main`. It is a types-only package with no runtime effect, and jest runs green.
Fixing it means changing a dependency, which was out of scope here.

## Known gaps

- No device or emulator was attached, so **no UI claim is made beyond what the
  unit tests and type system can prove**. Screenshot evidence and a Maestro run
  are still required before calling the visual redesign verified on hardware.
- The Leaflet SVG fallback is defensive code for a case that should not occur
  with the engine bundled; it is not exercised by any automated test.
- The 500 ms camera-follow throttle is reasoned about but not measured.
- The official JuanTrike logo was not found in the related project's asset folders.
  The app still shows a plain-text wordmark and the default Expo launcher icon.

## How to re-run

```bash
npx tsc --noEmit          # typecheck
npx expo lint             # lint
npx jest                  # unit tests
node tools/extract-roads.mjs   # rebuild the road graph (JT_FETCH=0 to use the cache)
node tools/bundle-leaflet.mjs  # regenerate the bundled map engine
```

With a device attached:

```bash
adb reverse tcp:8081 tcp:8081
npx expo start
maestro test -e RUN=v2-1 maestro/flows/positive-run.yaml
maestro test maestro/flows/mode-switch-regression.yaml
maestro test maestro/flows/negative-decline.yaml
maestro test maestro/flows/negative-three-offers.yaml
maestro test maestro/flows/negative-outside-coverage.yaml
maestro test maestro/flows/negative-reset-active.yaml
```

# JuanTrike UI mapping v2 — design

Design-system and map-experience notes for the `feature/ui-mapping-v2` branch.

## Principles

1. **One source of truth for look.** Colour, spacing, radius, elevation, type and
   the minimum touch target live in `src/theme/tokens.ts`. Components in
   `src/components/Ui.tsx` consume them and nothing else hard-codes a hex value.
2. **The map is the product surface.** It is never covered by a full-screen
   overlay. Status banners sit in a strip at the top; the trip sheet is capped at
   ~52 % of the screen so the route stays visible while the passenger reads a fare.
3. **Honesty over polish.** Anything synthetic says so on screen: "DEMO MODE",
   "SYNTHETIC TODA coverage", "Simulated", "Illustrative path". A fallback route
   never wears the same badge as a road route.
4. **Zero new runtime dependencies.** No `expo-linear-gradient`, no
   `react-native-svg`. Every visual is plain React Native styling or the Leaflet
   engine already in the WebView. Adding a library for a gradient would have
   meant another native module to keep Expo-SDK-compatible for no gain.

## Design tokens

`src/theme/tokens.ts`:

| Export | Contents |
|---|---|
| `colors` | Brand blue, success green, navigation amber, danger red, plus surface/background/border/text ramps and soft tints |
| `spacing` | 4 / 8 / 12 / 16 / 24 / 32 |
| `radius` | 8 / 12 / 18 / 24 / pill |
| `shadow` | `none`, `card`, `sheet`, `fab` — each sets **both** `shadow*` and Android `elevation` |
| `typography` | `display` → `micro` type ramp, system font, weight carries hierarchy |
| `HIT_TARGET` | 44. No control ships smaller |
| `routeColors` | `preview`, `approach`, `trip`, `traveled` |

`routeColors` are chosen to stay distinguishable under common colour-vision
deficiencies: blue / amber / blue-grey, differing in both hue and lightness, and
the travelled half is additionally rendered thinner and dimmer so colour is not
the only signal.

## Component library

`src/components/Ui.tsx` — all pure views, no data access:

`Button` (6 variants), `IconButton`, `Card` (3 tones), `Badge` (6 tones), `Chip`,
`Avatar`, `DemoBanner`, `Title`, `Muted`, `SectionTitle`, `KeyValue`, `Divider`,
`SegmentedControl`, `EmptyState`, `Skeleton`, `ProgressBar`, `RouteStepper`,
`SheetSurface`.

Every original export kept its name and props, so nothing outside the screens had
to change to adopt the new look.

## The map

### Why the engine is now bundled

`src/components/MapView.tsx` used to inject Leaflet from cdnjs with SRI hashes.
That was the last network dependency in the render path, and it made the
"offline" story hollow: with no CDN, no map at all.

`tools/bundle-leaflet.mjs` downloads Leaflet 1.9.4 and writes
`src/map/leafletAssets.ts` (162 KiB). The WebView document now inlines the engine
and its CSS. **The map engine needs no network.** Only tiles do.

| Layer | Offline behaviour |
|---|---|
| Map engine (Leaflet) | Bundled — always available |
| Coverage polygons, markers, routes | Drawn from bundled data — always available |
| Street tiles | Not available; the UI says so |
| Booking simulation | Unaffected — it never needed the network |

When tiles cannot load, the device fires `offline` (and the tile layer reports
`tileerror`), and an honest banner appears: *"Offline — live map tiles
unavailable"*, with the synthetic coverage and the bundled route still drawn
underneath. On reconnect the page redraws the tile layer and the banner clears.

A final safety net: if Leaflet itself fails to initialise, the page falls back to
a projected SVG that still renders zones, markers and route polylines, so the map
area is never blank.

### Performance: diff, don't rebuild

The WebView loads its document **once**. Every later change is pushed as data:

```ts
webRef.current?.injectJavaScript(`window.applyState(${JSON.stringify(payload)}); true;`);
```

Inside the page, `window.applyState` diffs:

- **Markers** are created once and then `setLatLng`; the inner icon HTML is only
  rewritten when the rendered markup actually differs.
- **Polylines** are keyed by a stable id (`route-preview`, `route-remaining`,
  `route-traveled`) and carry a signature of their endpoints plus a midpoint
  sample. A line is only rebuilt when its geometry or style changes.
- **Camera** is split in two: `focus` jumps on an explicit recenter (keyed), and
  `follow` pans at most every 500 ms so a 4 Hz vehicle tick cannot thrash the
  camera.
- **Zones** update style only; their rings are never re-parsed.

The result is that a 250 ms simulation tick costs one JSON string and at most one
`setLatLngs`, not a document reload.

### Context split, so the sheet stops re-rendering

`src/booking/DemoContext.tsx` now exposes two contexts:

| Hook | Holds | Re-renders |
|---|---|---|
| `useDemoState()` | booking machine `state`, `dispatch` | every tick |
| `useDemoControls()` | role, language, pause, speed, driver online, presenter actions | almost never |

`useDemo()` still exists and merges both, so existing call sites were untouched.
`App.tsx`'s shell and `DemoPanel` now subscribe only to what they need, and
`DemoPanel` returns `null` when closed — a closed presenter panel no longer
subscribes to the clock at all.

### Map semantics

- **Distinct markers**, each with its own shape *and* colour (not colour alone):
  teardrop pin for pickup (green), teardrop pin for destination (amber), circle
  with a rotating arrow for the simulated vehicle, small pulsing dot for the real
  GPS fix, flag tile for a synthetic terminal.
- **Marker taps are separate from map taps.** Markers post `onMarkerTap(id)`;
  the map background posts `onTapCoords(coords)`, which is what sets pickup or
  destination. Selecting a marker raises a contextual card instead of silently
  moving the booking.
- **Route layers** come from `buildRouteLayers()` — one shared function, so
  Passenger and Driver can never disagree about what is drawn.
- **Initial camera** fits the synthetic coverage, so the area the user must book
  inside is visible on first paint.
- **Attribution** is rendered in React Native, always visible, so the ODbL credit
  is never scrolled away or covered.

## Screens

### Passenger

Map on top, trip sheet below. The sheet carries:

1. Marker contextual card (when a marker is tapped)
2. Location card — segmented Pickup / Destination picker, both rows with live
   coverage verdict, empty state when nothing is set
3. Coverage warning (outside-coverage)
4. Review booking — straight-line distance, DEMO fare, payment chips, route-source badge
5. Navigation panel — stage stepper, remaining metres, simulated ETA, progress, route source and the route note
6. Status cards — searching / offered / assigned / arrived / on trip / completed
7. History modal

The map chip always shows what the next tap will do: "Tap the map to set pickup"
/ "Tap the map to set destination", or the lock message while a booking runs.

### Driver

Same map, plus an online/offline chip and the GPS fix chip. The sheet leads with
**Trip history** (toggle) then the **incoming offer card** — offer details and the
Accept / Decline row sit at the top so no scrolling is needed during a live
countdown. Below that: navigation panel, active-trip actions, an empty state when
idle, driver profile with shift status, and the synthetic FIFO queue.

### Welcome

Wordmark, language toggle, the two mode buttons and three chips stating what the
demo actually is: bundled OSM routing, simulated ETA/traffic, synthetic coverage.

## Strings

`src/i18n/strings.ts` gained ~55 `en` keys and their `fil` equivalents for the
navigation panel, markers, offline banner, legend, sheet sections, driver shift
and queue, empty states and route preview. All pre-existing keys kept their exact
text — the Maestro flows assert on several of them verbatim.

## Accessibility

- Every control meets `HIT_TARGET` (44) and exposes `accessibilityRole` +
  `accessibilityLabel`.
- The progress bar publishes `accessibilityValue` min/max/now.
- Marker state is signalled by shape as well as colour; coverage verdicts are
  text badges, not colour-only dots.
- `Skeleton` is hidden from the accessibility tree so a shimmer never becomes a
  phantom label.

## Known trade-offs

- No `react-native-svg` means the Leaflet-in-WebView map is the only real map
  surface; the SVG path is a last-resort fallback, not a first-class renderer.
- The vehicle heading animates via a CSS transition on an inner element, so it
  steps at the simulation tick rather than interpolating between ticks. That
  keeps Leaflet's own marker transform untouched.
- Zone tooltips are Leaflet DOM and cannot be localised per language after mount.

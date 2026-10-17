# Offline road-following routing

How JuanTrike draws a route that follows real streets, entirely on the device,
with no routing server and no network of any kind.

## What changed

Version 1 drew `simulatedRoute()` — a 3-point synthetic path between pickup and
destination. It was honest (`routeSimulated: 'SIMULATED route — not road routing'`)
but it did not follow streets.

Version 2 routes over a bundled crop of OpenStreetMap and keeps the old path
only as a labelled fallback. The original `simulatedRoute()` function is
untouched: `__tests__/dispatch.test.ts` still asserts it returns exactly three
points, and it is still what `routeBetween()` returns when a point is off-network.

## Pipeline

```
Overpass /api/0.6/map  ──►  tools/extract-roads.mjs  ──►  src/data/roadGraph.json
      (bbox)                    junction-preserving              287 KiB, bundled
                                contraction of drivable ways
```

`tools/extract-roads.mjs` does the following, deterministically:

1. Fetches OpenStreetMap for the crop around Angeles City, Pampanga. The public
   `/api/0.6/map` endpoint refuses very large bboxes (`400 Bad Request — too many
   nodes`), so the tool recursively subdivides into quadrants until each request
   fits.
2. Parses the XML with its own attribute parser (no XML dependency).
3. Keeps drivable highway ways only; footways, steps, cycleways, tracks and
   administrative boundaries are dropped.
4. Clips every way to the target bbox.
5. **Contracts junction-preserving.** A node is kept only when it is a junction
   (degree ≠ 2), an endpoint, or part of a closed way. Degree-2 chains between
   junctions are simplified with a Douglas–Peucker pass. This is what makes the
   graph 287 KiB instead of tens of megabytes without losing intersections —
   and intersections are the only thing A* needs in order to stay on the network.

Raw Overpass responses are cached in `tools/cache/osm-tiles.json` (gitignored,
~30 MB). Re-running the extractor with `JT_FETCH=0` rebuilds the graph offline
from that cache.

## Graph format

`src/data/roadGraph.json`:

```jsonc
{
  "coords": [lat0, lon0, lat1, lon1, ...],   // flat, 2 floats per node
  "edges":  [a, b, a, c, ...],               // undirected, stored as both directions
  "bbox":   [minLon, minLat, maxLon, maxLat],
  "nodeCount": 9458, "edgeCount": 11892, "lengthM": 694482
}
```

At first use `router.ts` builds a CSR adjacency structure (`start`/`to`/`weight`)
in `Float64Array`/`Int32Array` and memoises it. Weights are metres of haversine
length.

| Property | Value |
|---|---|
| Nodes | 9,458 |
| Edges | 11,892 |
| Total road length | 694.5 km |
| Bbox | `[120.57, 15.11, 120.622, 15.182]` |
| Connected components | 31 (largest holds 8,971 nodes) |
| Bundle size | 287 KiB |

## Search

`routeBetween(from, to)`:

1. If either point is outside `bbox` → illustrative fallback.
2. `nearestNode()` — planar pre-filter on `hypot(dLat·111000, dLon·108000)`, exact
   haversine only for the current best. O(n) over 9,458 nodes, ~90 µs.
3. If the farther endpoint snaps more than `MAX_SNAP_M = 400` m → illustrative
   fallback. A point in a field is not a road; we would rather say so than
   invent a connector.
4. A* with a binary min-heap and a haversine-to-goal heuristic (admissible, so
   the path is optimal on this graph).
5. The exact `from`/`to` coordinates are re-attached as the first and last
   vertices, and zero-length duplicates are dropped.

Results are memoised in a 96-entry LRU keyed on coordinates rounded to 1e-5
(~1.1 m), so a re-render during a simulated tick is a map lookup.

## Evidence

Measured with the bundled demo coordinates (`DEMO_PICKUP_COORDS` →
`DEMO_DESTINATION_COORDS`) via the test suite:

| Route | Source | Points | Distance | Longest segment | Endpoint snap |
|---|---|---|---|---|---|
| Trip (pickup → destination) | `road-network` | 45 | **1.845 km** | 174 m | 28 m |
| Straight-line (old behaviour) | — | 3 | 1.456 km | — | — |
| Approach (driver start → pickup) | `road-network` | 18 | 0.505 km | 85 m | 28 m |
| Pickup → outside-coverage point | `illustrative` | 3 | — | — | > bbox |

The road distance is 27 % longer than the straight line, which is the expected
signature of a route that actually follows streets.

## What this is not

- **Not an official route.** The graph is a demo crop of OSM. It confers no
  right to use any road and is not a validated tricycle profile — it does not
  know which streets a tricycle may legally use.
- **Not live.** No traffic, no closures, no live positions.
- **Not OSM-faithful at the edges.** Points farther than 400 m from the network
  fall back to the illustrative path rather than being force-snapped.
- **OSM tile usage.** Tiles are requested from `tile.openstreetmap.org` for demo
  volume only. The *map engine* no longer needs the network at all (see
  `docs/UI_MAPPING_V2_DESIGN.md`), but tiles do.

### OSRM was evaluated and deliberately not integrated

The public `router.project-osrm.org` demo server was reachable during
development and would have produced turn-by-turn routes immediately. It was
rejected for runtime use because:

- it is a shared demo instance with no availability or rate-limit guarantee,
- depending on it would make the core booking flow fail without network,
- and the acceptance criteria require the route to render offline.

The bundled graph gives a route in ~1 ms with zero network. OSRM remains the
obvious upgrade path if a production build ever needs real turn-by-turn: the
router already isolates the choice behind one function, `routeBetween()`.

## Code map

| File | Role |
|---|---|
| `tools/extract-roads.mjs` | OSM fetch, clipping, junction-preserving contraction |
| `src/data/roadGraph.json` | Bundled graph (committed) |
| `src/booking/router.ts` | CSR build, A*, LRU cache, fallback |
| `src/booking/geo.ts` | `polylineKm`, `bearingDeg`, `headingAt`, `splitRoute` |
| `src/booking/movement.ts` | Status → route, vehicle position, heading, progress |
| `src/booking/routeLayers.ts` | Status → map polylines (preview / travelled / remaining) |
| `__tests__/router.test.ts` | Graph, A*, cache, fallback |
| `__tests__/routeGeometry.test.ts` | Split/heading maths on real routes |
| `__tests__/routeLayers.test.ts` | Layer set per booking status |

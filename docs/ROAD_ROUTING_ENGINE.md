# Road Routing Engine

## Architecture

`src/booking/router.ts` routes locally over `src/data/roadGraph.json`. The graph is a bounded OpenStreetMap crop extracted by `tools/extract-roads.mjs` for the Angeles demo area. The current artifact contains 9,458 nodes, 11,892 undirected edges and about 694.5 km of source edge length. Its coordinates and edge list ship in the app bundle.

At runtime the router builds compact typed-array adjacency data and uses on-device A* with haversine distance as its heuristic. Endpoint snapping is limited to 400 m. Results include the drawn points, polyline distance, route source (`road-network` or `illustrative`) and snap distance. Repeated requests use a bounded in-memory cache.

The screen and route layers use the same route result that is checked by the city boundary. If the point cannot snap to a connected local graph segment, the router labels the result as illustrative; the map does not claim that the illustrative line follows roads. No OSRM, Overpass, route API, or other routing network call is made.

## Data use and constraints

The OpenStreetMap crop is subject to ODbL attribution/share-alike terms; retain its source and attribution with the application. The downloaded raster map tiles are separate and requested on demand from the OpenStreetMap tile service. Follow the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/): use HTTPS, identify the app in its WebView user agent, display attribution, honor cache headers, and do not bulk-download or prefetch tiles. Network tile availability has no service guarantee.

The graph is a general road crop, not an approved tricycle network. It may omit roads, access restrictions, closures, turn restrictions, one-way details, current construction, local service limits, traffic, road safety, and vehicle-specific restrictions. A successful path result is demonstration geometry only.

## Fallback and geofence

The fallback is explicit (`source: 'illustrative'`) and is not a fabricated road path. The city-boundary validation separately samples the displayed polyline at intervals up to 10 m; an illustrative route is still subject to the same mapped-city check. Neither passing check creates an official route or service entitlement.

## Tests

`__tests__/router.test.ts`, `__tests__/routeGeometry.test.ts`, and `__tests__/routeLayers.test.ts` cover graph routing, snapping/fallback behavior, geometry and display layering. `__tests__/cityBoundary.test.ts` confirms a bundled-network route remains within the selected demo outline.

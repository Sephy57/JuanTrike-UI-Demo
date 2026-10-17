# Angeles City Geofencing

## Purpose and limits

The demo uses a city outline to stop sample bookings and displayed passenger/driver routes from silently extending outside the selected service area. This is an indicative map check only. It is **not** an official Angeles City boundary determination, franchise/TODA jurisdiction, road-use approval, dispatch guarantee, or legal service-area statement. The synthetic TODA zones remain fictional and separate from the city outline.

## Source geometry

The bundled feature is the `Angeles City` PHL ADM3 feature from the geoBoundaries `gbOpen` product. Source metadata identifies the represented boundary year as 2020 and lists the National Mapping and Resource Information Authority (NAMRIA), the Philippine Statistics Authority (PSA), and OCHA Philippines as inputs. The extracted source feature ID is `30758251B17687282333707`; its simplified Polygon has one closed outer ring (76 coordinate positions including closure) and no holes. The checked bounds are approximately 120.449508052–120.642657133° E and 15.108419555–15.222545479° N.

The data file is `src/data/angelesCityBoundary.json`; source selection and decision logic are in `src/booking/cityBoundary.ts`. The retained source metadata reports the geoBoundaries product under CC BY 4.0 and source metadata under CC BY 3.0 IGO. See [geoBoundaries API and data access](https://www.geoboundaries.org/api.html) and [geoBoundaries attribution guidance](https://www.geoboundaries.org/).

## Coordinate and inclusion rules

GeoJSON positions are `[longitude, latitude]` in WGS84/CRS84 order. App points use named `{ latitude, longitude }` fields. Conversion is explicit at the boundary; valid values are finite and within the global latitude and longitude ranges.

`isAngelesCityPoint` performs a point-in-polygon check. Outer-ring edges count as inside. For polygons that contain holes, hole interiors count as outside while a hole edge counts as boundary/inside, matching the same inclusive-edge product rule. The current extracted feature has no holes.

`isRouteInsideAngelesCity` samples each route segment at intervals no greater than 10 m and rejects the route if any sample falls outside. This catches concavities between sparse route vertices, but the result still depends on the simplified source geometry and straight-line interpolation between samples.

Booking confirmation requires all of the following:

1. Pickup and destination are within the mapped Angeles City outline.
2. Both endpoints are within at least one synthetic demo TODA zone.
3. The displayed route geometry stays within the mapped outline.

The map draws the city outline separately from TODA zone polygons and attributes the mapped outline to geoBoundaries. Outside-city endpoints, outside-zone endpoints, or a route leaving the outline are reported as distinct blocked conditions.

## Refresh and review before real service

The bundled simplified geometry is a presentation snapshot, not a continuously refreshed administrative record. Before any real service-area use, obtain the proper city/LGU/TODA source, confirm its publication date, accuracy and redistribution terms, validate disputed edge cases with authorized local reviewers, and replace the demo source through a documented update. Do not describe a successful point-in-polygon test as municipal approval.

## Tests

`__tests__/cityBoundary.test.ts` covers coordinate order, inclusive outer edges, hole behavior, multipolygons, invalid points, route crossing, source metadata, the default demo area, and a route produced by the bundled road router.

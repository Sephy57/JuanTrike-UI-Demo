# Geofencing and simulated GPS demo

## Synthetic TODA coverage

Defined in `src/booking/demoZones.ts`. Each zone is a rectangle for illustration only.

| Zone | Colour | Lat range | Lon range | Drivers |
|---|---|---|---|---|
| SYNTHETIC TODA A | blue | 15.132–15.152 | 120.582–120.602 | Mang Ben, Mang Joel |
| SYNTHETIC TODA B | green | 15.152–15.170 | 120.582–120.610 | Mang Rudy |
| SYNTHETIC TODA C | amber | 15.120–15.132 | 120.582–120.610 | none (demonstrates no eligible driver) |

- Zones are **not** official TODA territories, LGU boundaries, or approved operating areas.
- The Angeles City viewport is a visual orientation only.
- A point inside a zone is tested with a ray-casting point-in-polygon check (`zoneFor`).

## Restricted-area demonstration

- **Outside example:** `DEMO_OUTSIDE_POINT` (15.14, 120.63) lies in no zone. Use the panel's *Simulate out-of-coverage booking* to set it as the destination.
- The coverage line reads "Outside demo coverage — not bookable", a restricted-area warning appears, and the Confirm button is disabled.
- If the confirm handler is called anyway, it returns false and the booking is not created (covered by `demoContext.test.tsx`).

## Eligibility

- A booking's pickup must be inside a zone.
- Only drivers whose TODA is that zone are offered the booking, in queue order (FIFO).
- A pickup in TODA C has no eligible driver and cancels after the search phase.

## Simulated route

- `simulatedRoute` draws a curved path from A to B through one bowed waypoint. It is labelled *SIMULATED route — not road routing*.
- Distances use straight-line (haversine) estimates and are labelled as demo estimates.
- The route is for presentation only and must not be described as navigation.

## Simulated movement

- Driver approach: from a synthetic starting offset relative to pickup to pickup, over `APPROACH_SECONDS` (20 demo seconds at 1x).
- Trip: pickup to destination, over `TRIP_SECONDS` (30 demo seconds at 1x).
- Position is the point at the current progress along the route (`pointAlong`).
- Movement advances only on the simulated clock, so it pauses with the presenter's pause control, speeds up with the speed control, and stops when the booking is cancelled or reset.
- Remaining time and distance shown to the presenter are computed from the same progress value.

## What is not claimed

- No physical GPS tracking. The device GPS, when present, is used only to centre the map.
- No route accuracy, traffic, or road-network claims.
- No TODA or LGU approval of any zone.

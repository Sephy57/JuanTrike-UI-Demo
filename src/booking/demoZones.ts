// SYNTHETIC DEMO DATA. These TODA zones, drivers and policy values are illustrative only.
// They are not official TODA territories, LGU boundaries, driver registrations or fares.
import type { LatLng } from './bookingMachine';

export interface DemoZone {
  id: string;
  label: string;
  color: string;
  /** Closed ring; the first point is not repeated. */
  ring: LatLng[];
}

export interface DemoDriver {
  id: string;
  name: string;
  /** Synthetic TODA this driver belongs to. */
  todaId: string;
  bodyNumber: string;
  /** Offset from the pickup point for the simulated starting position. */
  startOffset: { dLat: number; dLon: number };
}

/** DEMO policy values. Presentation pacing, not verified official rules. */
export const DEMO_POLICY = {
  /** Seconds a driver has to accept an offer (demo policy). */
  OFFER_WINDOW_SECONDS: 20,
  /** Offers per booking before the demo cancels with no driver (demo policy). */
  MAX_OFFER_ATTEMPTS: 3,
  /** Simulated seconds for the driver to reach pickup at 1x speed. */
  APPROACH_SECONDS: 20,
  /** Simulated seconds for the trip at 1x speed. */
  TRIP_SECONDS: 30,
  /** Simulated seconds between confirming a booking and starting the driver search. */
  REQUEST_SECONDS: 0.6,
  /** Simulated seconds of searching before each offer is made. */
  SEARCH_SECONDS: 2,
} as const;

function rect(latMin: number, latMax: number, lonMin: number, lonMax: number): LatLng[] {
  return [
    { latitude: latMin, longitude: lonMin },
    { latitude: latMin, longitude: lonMax },
    { latitude: latMax, longitude: lonMax },
    { latitude: latMax, longitude: lonMin },
  ];
}

/** Synthetic coverage zones over the Angeles City demo viewport. */
export const DEMO_ZONES: DemoZone[] = [
  { id: 'TODA-A', label: 'SYNTHETIC TODA A', color: '#1F5FBF', ring: rect(15.132, 15.152, 120.582, 120.602) },
  { id: 'TODA-B', label: 'SYNTHETIC TODA B', color: '#1E9E5A', ring: rect(15.152, 15.17, 120.582, 120.61) },
  { id: 'TODA-C', label: 'SYNTHETIC TODA C', color: '#F2A900', ring: rect(15.12, 15.132, 120.582, 120.61) },
];

/** A point deliberately outside every demo zone, used for the restricted-area example. */
export const DEMO_OUTSIDE_POINT: LatLng = { latitude: 15.14, longitude: 120.63 };

/** FIFO order: earlier entries are offered first. Synthetic people only. */
export const DEMO_DRIVERS: DemoDriver[] = [
  { id: 'D-001', name: 'Mang Ben', todaId: 'TODA-A', bodyNumber: 'AB-014', startOffset: { dLat: 0.0035, dLon: -0.004 } },
  { id: 'D-002', name: 'Mang Rudy', todaId: 'TODA-B', bodyNumber: 'BR-022', startOffset: { dLat: 0.005, dLon: 0.001 } },
  { id: 'D-003', name: 'Mang Joel', todaId: 'TODA-A', bodyNumber: 'AJ-031', startOffset: { dLat: -0.004, dLon: -0.002 } },
  { id: 'D-004', name: 'Mang Ernie', todaId: 'TODA-A', bodyNumber: 'AE-047', startOffset: { dLat: 0.002, dLon: -0.006 } },
];

function ringContains(point: LatLng, ring: LatLng[]): boolean {
  // Ray-casting point-in-polygon test.
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    const crosses =
      a.latitude > point.latitude !== b.latitude > point.latitude &&
      point.longitude < ((b.longitude - a.longitude) * (point.latitude - a.latitude)) / (b.latitude - a.latitude) + a.longitude;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** The synthetic zone containing a point, or null when outside all demo coverage. */
export function zoneFor(point: LatLng): DemoZone | null {
  return DEMO_ZONES.find((zone) => ringContains(point, zone.ring)) ?? null;
}

/** Drivers whose synthetic TODA covers the point, in FIFO order. */
export function eligibleDrivers(point: LatLng): DemoDriver[] {
  const zone = zoneFor(point);
  if (!zone) return [];
  return DEMO_DRIVERS.filter((driver) => driver.todaId === zone.id);
}

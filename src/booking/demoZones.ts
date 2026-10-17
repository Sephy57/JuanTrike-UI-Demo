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
  /** Synthetic profile score used only in the presentation dashboard. */
  demoRating: number;
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
  {
    id: 'TODA-A',
    label: 'SYNTHETIC TODA A',
    color: '#1E9E5A',
    // Angular, illustrative coverage shape echoing the reference map while
    // keeping all demo pickup, destination and terminal coordinates covered.
    ring: [
      { latitude: 15.132, longitude: 120.588 },
      { latitude: 15.135, longitude: 120.582 },
      { latitude: 15.143, longitude: 120.584 },
      { latitude: 15.152, longitude: 120.589 },
      { latitude: 15.152, longitude: 120.594 },
      { latitude: 15.149, longitude: 120.601 },
      { latitude: 15.142, longitude: 120.602 },
      { latitude: 15.136, longitude: 120.598 },
    ],
  },
  { id: 'TODA-B', label: 'SYNTHETIC TODA B', color: '#1F5FBF', ring: rect(15.152, 15.17, 120.582, 120.61) },
  { id: 'TODA-C', label: 'SYNTHETIC TODA C', color: '#F2A900', ring: rect(15.12, 15.132, 120.582, 120.61) },
];

/** A point deliberately outside every demo zone, used for the restricted-area example. */
export const DEMO_OUTSIDE_POINT: LatLng = { latitude: 15.14, longitude: 120.63 };

/** Synthetic demo terminals. Illustrative map furniture only — never a registered TODA terminal. */
export interface DemoTerminal {
  id: string;
  label: string;
  zoneId: string;
  coords: LatLng;
}

export const DEMO_TERMINALS: DemoTerminal[] = [
  { id: 'TERM-A', label: 'SYNTHETIC TODA A terminal', zoneId: 'TODA-A', coords: { latitude: 15.143, longitude: 120.5905 } },
  { id: 'TERM-B', label: 'SYNTHETIC TODA B terminal', zoneId: 'TODA-B', coords: { latitude: 15.161, longitude: 120.596 } },
  { id: 'TERM-C', label: 'SYNTHETIC TODA C terminal', zoneId: 'TODA-C', coords: { latitude: 15.126, longitude: 120.596 } },
];

/** FIFO order: earlier entries are offered first. Synthetic people only. */
export const DEMO_DRIVERS: DemoDriver[] = [
  { id: 'D-001', name: 'Mang Ben', todaId: 'TODA-A', bodyNumber: 'AB-014', demoRating: 4.9, startOffset: { dLat: 0.0035, dLon: -0.004 } },
  { id: 'D-002', name: 'Mang Rudy', todaId: 'TODA-B', bodyNumber: 'BR-022', demoRating: 4.7, startOffset: { dLat: 0.005, dLon: 0.001 } },
  { id: 'D-003', name: 'Mang Joel', todaId: 'TODA-A', bodyNumber: 'AJ-031', demoRating: 4.8, startOffset: { dLat: -0.004, dLon: -0.002 } },
  { id: 'D-004', name: 'Mang Ernie', todaId: 'TODA-A', bodyNumber: 'AE-047', demoRating: 4.9, startOffset: { dLat: 0.002, dLon: -0.006 } },
];

function ringContains(point: LatLng, ring: LatLng[]): boolean {
  // Boundary points are covered so taps on a shared synthetic-zone edge do
  // not create a narrow false gap. DEMO_ZONES order resolves shared edges.
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (pointOnSegment(point, a, b)) return true;
    const crosses =
      a.latitude > point.latitude !== b.latitude > point.latitude &&
      point.longitude < ((b.longitude - a.longitude) * (point.latitude - a.latitude)) / (b.latitude - a.latitude) + a.longitude;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** The synthetic zone containing a point, or null when outside all demo coverage. */
export function zoneFor(point: LatLng): DemoZone | null {
  if (
    !Number.isFinite(point.latitude) ||
    !Number.isFinite(point.longitude) ||
    point.latitude < -90 ||
    point.latitude > 90 ||
    point.longitude < -180 ||
    point.longitude > 180
  ) {
    return null;
  }
  return DEMO_ZONES.find((zone) => ringContains(point, zone.ring)) ?? null;
}

function pointOnSegment(point: LatLng, a: LatLng, b: LatLng): boolean {
  const cross =
    (point.longitude - a.longitude) * (b.latitude - a.latitude) -
    (point.latitude - a.latitude) * (b.longitude - a.longitude);
  if (Math.abs(cross) > 1e-10) return false;
  return (
    point.latitude >= Math.min(a.latitude, b.latitude) - 1e-10 &&
    point.latitude <= Math.max(a.latitude, b.latitude) + 1e-10 &&
    point.longitude >= Math.min(a.longitude, b.longitude) - 1e-10 &&
    point.longitude <= Math.max(a.longitude, b.longitude) + 1e-10
  );
}

/** Drivers whose synthetic TODA covers the point, in FIFO order. */
export function eligibleDrivers(point: LatLng): DemoDriver[] {
  const zone = zoneFor(point);
  if (!zone) return [];
  return DEMO_DRIVERS.filter((driver) => driver.todaId === zone.id);
}

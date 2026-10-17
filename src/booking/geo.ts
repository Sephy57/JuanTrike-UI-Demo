import type { LatLng } from './bookingMachine';

/** Downtown Angeles City camera center, biased north to keep the pickup pin clear of the passenger overlay. */
export const ANGELES_CITY_CENTER: LatLng = { latitude: 15.1480, longitude: 120.5960 };

export const DEMO_PICKUP_COORDS: LatLng = { latitude: 15.1466, longitude: 120.5879 };
export const DEMO_DESTINATION_COORDS: LatLng = { latitude: 15.1372, longitude: 120.5968 };

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Synthetic DEMO fare. Not a TODA or official fare; it exists only to make the
 * presentation flow read naturally.
 */
export function demoFareFor(distanceKm: number): number {
  const BASE = 20;
  const PER_KM = 13.5;
  return Math.round(BASE + PER_KM * distanceKm);
}

export function formatCoords(c: LatLng): string {
  return `${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`;
}

/**
 * SIMULATED route for presentation only. Not road routing: it adds one bowed
 * waypoint so the path does not read as a straight line. Never describe the
 * result as an actual navigation route.
 */
export function simulatedRoute(from: LatLng, to: LatLng): LatLng[] {
  const midLat = (from.latitude + to.latitude) / 2;
  const midLon = (from.longitude + to.longitude) / 2;
  const dLat = to.latitude - from.latitude;
  const dLon = to.longitude - from.longitude;
  // Perpendicular offset, 12% of the segment length.
  const bow = 0.12;
  return [
    from,
    { latitude: midLat - dLon * bow, longitude: midLon + dLat * bow },
    to,
  ];
}

/** Point at fraction t (0..1) along a polyline, measured by straight segment length. */
export function pointAlong(points: LatLng[], t: number): LatLng {
  const clamped = Math.min(1, Math.max(0, t));
  if (points.length === 0) return { latitude: 0, longitude: 0 };
  if (points.length === 1 || clamped === 0) return points[0];
  if (clamped === 1) return points[points.length - 1];

  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const len = haversineKm(points[i - 1], points[i]);
    lengths.push(len);
    total += len;
  }
  let target = total * clamped;
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] === 0 ? 0 : target / lengths[i];
      const a = points[i];
      const b = points[i + 1];
      return {
        latitude: a.latitude + (b.latitude - a.latitude) * f,
        longitude: a.longitude + (b.longitude - a.longitude) * f,
      };
    }
    target -= lengths[i];
  }
  return points[points.length - 1];
}

/** Total length of a polyline in kilometres. */
export function polylineKm(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineKm(points[i - 1], points[i]);
  return total;
}

/** Initial bearing in degrees (0 = north, clockwise) from `a` towards `b`. */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const φ1 = toRad(a.latitude);
  const φ2 = toRad(b.latitude);
  const Δλ = toRad(b.longitude - a.longitude);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** Normalises any angle in degrees to the range (-180, 180]. */
export function normaliseDegrees(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/**
 * Heading of the path at fraction `t`: the bearing of the segment the point
 * currently sits on. Falls back to the bearing of the last segment at `t = 1`.
 */
export function headingAt(points: LatLng[], t: number): number {
  if (points.length < 2) return 0;
  const clamped = Math.min(1, Math.max(0, t));
  let travelled = 0;
  const total = polylineKm(points);
  if (total === 0) return bearingDeg(points[0], points[points.length - 1]);
  const target = total * clamped;
  for (let i = 1; i < points.length; i += 1) {
    const seg = haversineKm(points[i - 1], points[i]);
    if (travelled + seg >= target || i === points.length - 1) {
      return bearingDeg(points[i - 1], points[i]);
    }
    travelled += seg;
  }
  return bearingDeg(points[points.length - 2], points[points.length - 1]);
}

export interface RouteSplit {
  /** Everything already travelled, ending exactly at the split point. */
  traveled: LatLng[];
  /** Everything still ahead, starting exactly at the split point. */
  remaining: LatLng[];
}

/**
 * Cuts a polyline at fraction `t` (0..1 of its length) so the map can draw the
 * completed part differently from the part still to come. Both halves share the
 * split point, so the two drawn lines meet without a visible gap.
 */
export function splitRoute(points: LatLng[], t: number): RouteSplit {
  if (points.length < 2) return { traveled: points.slice(), remaining: [] };
  const clamped = Math.min(1, Math.max(0, t));
  if (clamped <= 0) return { traveled: [], remaining: points.slice() };
  if (clamped >= 1) return { traveled: points.slice(), remaining: [] };

  const total = polylineKm(points);
  const target = total * clamped;
  const traveled: LatLng[] = [points[0]];
  let travelled = 0;
  for (let i = 1; i < points.length; i += 1) {
    const seg = haversineKm(points[i - 1], points[i]);
    if (travelled + seg >= target) {
      const f = seg === 0 ? 0 : (target - travelled) / seg;
      const split: LatLng = {
        latitude: points[i - 1].latitude + (points[i].latitude - points[i - 1].latitude) * f,
        longitude: points[i - 1].longitude + (points[i].longitude - points[i - 1].longitude) * f,
      };
      traveled.push(split);
      return { traveled, remaining: [split, ...points.slice(i)] };
    }
    traveled.push(points[i]);
    travelled += seg;
  }
  return { traveled: points.slice(), remaining: [] };
}

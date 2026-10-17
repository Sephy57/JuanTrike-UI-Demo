import {
  bearingDeg,
  headingAt,
  normaliseDegrees,
  pointAlong,
  polylineKm,
  splitRoute,
  DEMO_DESTINATION_COORDS,
  DEMO_PICKUP_COORDS,
} from '../src/booking/geo';
import { resetRouter, routeBetween } from '../src/booking/router';

const line = [
  { latitude: 15.14, longitude: 120.58 },
  { latitude: 15.14, longitude: 120.59 },
  { latitude: 15.15, longitude: 120.59 },
];

beforeEach(() => resetRouter());

describe('bearingDeg / normaliseDegrees', () => {
  it('points north, east, south and west correctly', () => {
    const origin = { latitude: 15.14, longitude: 120.58 };
    expect(bearingDeg(origin, { latitude: 15.15, longitude: 120.58 })).toBeCloseTo(0, 0);
    expect(bearingDeg(origin, { latitude: 15.14, longitude: 120.59 })).toBeCloseTo(90, 0);
    expect(bearingDeg(origin, { latitude: 15.13, longitude: 120.58 })).toBeCloseTo(180, 0);
    expect(bearingDeg(origin, { latitude: 15.14, longitude: 120.57 })).toBeCloseTo(-90, 0);
  });

  it('wraps any angle into (-180, 180]', () => {
    expect(normaliseDegrees(0)).toBe(0);
    expect(normaliseDegrees(180)).toBe(180);
    expect(normaliseDegrees(181)).toBe(-179);
    expect(normaliseDegrees(-180)).toBe(180);
    expect(normaliseDegrees(720 + 45)).toBe(45);
  });
});

describe('headingAt', () => {
  it('follows the bearing of the segment the point currently sits on', () => {
    expect(headingAt(line, 0)).toBeCloseTo(90, 0); // east along the first leg
    expect(headingAt(line, 1)).toBeCloseTo(0, 0); // north along the last leg
    expect(headingAt(line, 0.5)).toBeCloseTo(0, 0);
  });

  it('handles a degenerate path without throwing', () => {
    expect(headingAt([line[0]], 0.5)).toBe(0);
    expect(headingAt([line[0], line[0]], 0.5)).toBe(0);
  });
});

describe('splitRoute', () => {
  it('returns the whole line ahead at t=0 and the whole line behind at t=1', () => {
    expect(splitRoute(line, 0)).toEqual({ traveled: [], remaining: line });
    const done = splitRoute(line, 1);
    expect(done.remaining).toEqual([]);
    expect(done.traveled).toEqual(line);
  });

  it('shares one split point so the two halves meet without a gap', () => {
    const { traveled, remaining } = splitRoute(line, 0.5);
    expect(traveled[traveled.length - 1]).toEqual(remaining[0]);
    expect(traveled.length).toBeGreaterThanOrEqual(2);
    expect(remaining.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps travelled length proportional to the requested fraction', () => {
    const total = polylineKm(line);
    const { traveled } = splitRoute(line, 0.25);
    expect(polylineKm(traveled) / total).toBeCloseTo(0.25, 3);
  });

  it('clamps out-of-range fractions', () => {
    expect(splitRoute(line, -5).traveled).toEqual([]);
    expect(splitRoute(line, 5).remaining).toEqual([]);
    expect(splitRoute([], 0.5).traveled).toEqual([]);
  });
});

describe('splitting a real bundled route', () => {
  it('keeps both halves connected and inside the original path', () => {
    const route = routeBetween(DEMO_PICKUP_COORDS, DEMO_DESTINATION_COORDS);
    const { traveled, remaining } = splitRoute(route.points, 0.4);
    expect(traveled[traveled.length - 1]).toEqual(remaining[0]);
    expect(traveled[0]).toEqual(route.points[0]);
    expect(remaining[remaining.length - 1]).toEqual(route.points[route.points.length - 1]);
    const total = polylineKm(route.points);
    expect(polylineKm(traveled)).toBeCloseTo(total * 0.4, 3);
  });

  it('walks the drawn route from start to finish as progress advances', () => {
    const route = routeBetween(DEMO_PICKUP_COORDS, DEMO_DESTINATION_COORDS);
    expect(pointAlong(route.points, 0)).toEqual(route.points[0]);
    expect(pointAlong(route.points, 1)).toEqual(route.points[route.points.length - 1]);
    const mid = pointAlong(route.points, 0.5);
    // The demo destination is south of the demo pickup, so the halfway point
    // must sit strictly between the two latitudes.
    expect(mid.latitude).toBeLessThan(DEMO_PICKUP_COORDS.latitude);
    expect(mid.latitude).toBeGreaterThan(DEMO_DESTINATION_COORDS.latitude);
    expect(polylineKm(route.points)).toBeGreaterThan(0);
  });
});

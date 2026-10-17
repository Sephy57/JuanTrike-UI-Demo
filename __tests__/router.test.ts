import { DEMO_DESTINATION_COORDS, DEMO_PICKUP_COORDS, haversineKm, simulatedRoute } from '../src/booking/geo';
import { MAX_SNAP_M, resetRouter, routeBetween, routeCacheSize, roadGraphInfo } from '../src/booking/router';
import { DEMO_DRIVERS, DEMO_OUTSIDE_POINT, DEMO_ZONES } from '../src/booking/demoZones';
import { approachRoute, tripRoute, vehicleStart } from '../src/booking/movement';
import { initialDemoState, DemoState, Place } from '../src/booking/bookingMachine';
import roadGraph from '../src/data/roadGraph.json';

const pickup: Place = { label: 'DEMO Pickup A', coords: DEMO_PICKUP_COORDS, source: 'demo' };
const destination: Place = { label: 'DEMO Destination B', coords: DEMO_DESTINATION_COORDS, source: 'demo' };

function metres(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  return haversineKm(a, b) * 1000;
}

function edgeKeys(): Set<string> {
  const edges = (roadGraph as unknown as { edges: number[] }).edges;
  const set = new Set<string>();
  for (let i = 0; i < edges.length; i += 2) {
    const a = edges[i];
    const b = edges[i + 1];
    set.add(a < b ? `${a}-${b}` : `${b}-${a}`);
  }
  return set;
}

function nodeIndex(): Map<string, number> {
  const coords = (roadGraph as unknown as { coords: number[] }).coords;
  const map = new Map<string, number>();
  for (let i = 0; i < coords.length / 2; i += 1) {
    map.set(`${coords[i * 2].toFixed(5)},${coords[i * 2 + 1].toFixed(5)}`, i);
  }
  return map;
}

beforeEach(() => resetRouter());

describe('bundled road graph', () => {
  it('is present and large enough to route the demo area', () => {
    const info = roadGraphInfo();
    expect(info.nodes).toBeGreaterThan(1000);
    expect(info.km).toBeGreaterThan(50);
  });

  it('covers the synthetic zones and the demo endpoints', () => {
    const bbox = (roadGraph as unknown as { bbox: [number, number, number, number] }).bbox;
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const inside = (p: { latitude: number; longitude: number }) =>
      p.longitude >= minLon && p.longitude <= maxLon && p.latitude >= minLat && p.latitude <= maxLat;
    expect(inside(DEMO_PICKUP_COORDS)).toBe(true);
    expect(inside(DEMO_DESTINATION_COORDS)).toBe(true);
    for (const zone of DEMO_ZONES) {
      for (const corner of zone.ring) expect(inside(corner)).toBe(true);
    }
  });
});

describe('road-following routes', () => {
  it('routes the demo trip over the bundled network instead of a straight line', () => {
    const route = routeBetween(DEMO_PICKUP_COORDS, DEMO_DESTINATION_COORDS);
    expect(route.source).toBe('road-network');
    expect(route.points[0]).toEqual(DEMO_PICKUP_COORDS);
    expect(route.points[route.points.length - 1]).toEqual(DEMO_DESTINATION_COORDS);
    expect(route.points.length).toBeGreaterThan(3);

    const straight = haversineKm(DEMO_PICKUP_COORDS, DEMO_DESTINATION_COORDS);
    // A road path is never shorter than the straight line and must detour a little.
    expect(route.distanceKm).toBeGreaterThanOrEqual(straight);
    expect(route.distanceKm).toBeGreaterThan(straight * 1.05);
  });

  it('only uses edges that exist in the bundled graph (after the endpoint snap)', () => {
    const route = routeBetween(DEMO_PICKUP_COORDS, DEMO_DESTINATION_COORDS);
    const keys = edgeKeys();
    const nodes = nodeIndex();
    let checked = 0;
    for (let i = 1; i < route.points.length - 2; i += 1) {
      const a = nodes.get(`${route.points[i].latitude.toFixed(5)},${route.points[i].longitude.toFixed(5)}`);
      const b = nodes.get(
        `${route.points[i + 1].latitude.toFixed(5)},${route.points[i + 1].longitude.toFixed(5)}`,
      );
      if (a === undefined || b === undefined) continue;
      expect(keys.has(a < b ? `${a}-${b}` : `${b}-${a}`)).toBe(true);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(2);
  });

  it('keeps every drawn segment short enough to read as a road on the map', () => {
    const route = routeBetween(DEMO_PICKUP_COORDS, DEMO_DESTINATION_COORDS);
    let longest = 0;
    for (let i = 1; i < route.points.length; i += 1) {
      longest = Math.max(longest, metres(route.points[i - 1], route.points[i]));
    }
    expect(longest).toBeLessThan(400);
  });

  it('deviates from the straight line by a visible margin', () => {
    const route = routeBetween(DEMO_PICKUP_COORDS, DEMO_DESTINATION_COORDS);
    let maxOffset = 0;
    for (const p of route.points) {
      // Distance from p to the pickup→destination great circle, approximated by
      // the distance to the closest point sampled along the straight segment.
      let best = Infinity;
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const s = {
          latitude: DEMO_PICKUP_COORDS.latitude + (DEMO_DESTINATION_COORDS.latitude - DEMO_PICKUP_COORDS.latitude) * t,
          longitude:
            DEMO_PICKUP_COORDS.longitude + (DEMO_DESTINATION_COORDS.longitude - DEMO_PICKUP_COORDS.longitude) * t,
        };
        best = Math.min(best, metres(p, s));
      }
      maxOffset = Math.max(maxOffset, best);
    }
    expect(maxOffset).toBeGreaterThan(50);
  });

  it('routes the driver approach over the network too', () => {
    const driver = DEMO_DRIVERS[0];
    const start = vehicleStart(driver, DEMO_PICKUP_COORDS);
    const route = routeBetween(start, DEMO_PICKUP_COORDS);
    expect(route.source).toBe('road-network');
    expect(route.points[0]).toEqual(start);
    expect(route.points[route.points.length - 1]).toEqual(DEMO_PICKUP_COORDS);
    expect(route.snapMetres).toBeLessThanOrEqual(MAX_SNAP_M);
  });

  it('produces the same polyline before and after the route cache is cleared', () => {
    const first = routeBetween(DEMO_PICKUP_COORDS, DEMO_DESTINATION_COORDS);
    const cached = routeBetween(DEMO_PICKUP_COORDS, DEMO_DESTINATION_COORDS);
    expect(cached).toBe(first);
    resetRouter();
    const fresh = routeBetween(DEMO_PICKUP_COORDS, DEMO_DESTINATION_COORDS);
    expect(fresh.points).toEqual(first.points);
    expect(fresh.source).toBe(first.source);
  });

  it('bounds the route cache so a long session cannot grow it forever', () => {
    for (let i = 0; i < 200; i += 1) {
      routeBetween(
        { latitude: DEMO_PICKUP_COORDS.latitude + i * 1e-4, longitude: DEMO_PICKUP_COORDS.longitude },
        DEMO_DESTINATION_COORDS,
      );
    }
    expect(routeCacheSize()).toBeLessThanOrEqual(96);
    expect(routeCacheSize()).toBeGreaterThan(1);
  });
});

describe('illustrative fallback', () => {
  it('is used for a point outside the bundled network, and is labelled as such', () => {
    const route = routeBetween(DEMO_PICKUP_COORDS, DEMO_OUTSIDE_POINT);
    expect(route.source).toBe('illustrative');
    expect(route.points).toHaveLength(3);
    expect(route.points).toEqual(simulatedRoute(DEMO_PICKUP_COORDS, DEMO_OUTSIDE_POINT));
  });

  it('never returns a route shorter than the straight line', () => {
    for (const zone of DEMO_ZONES) {
      for (const corner of zone.ring) {
        const route = routeBetween(corner, DEMO_PICKUP_COORDS);
        expect(route.distanceKm + 1e-9).toBeGreaterThanOrEqual(
          haversineKm(corner, DEMO_PICKUP_COORDS),
        );
      }
    }
  });
});

describe('movement helpers use the drawn route', () => {
  const offered: DemoState = {
    ...initialDemoState,
    status: 'DRIVER_ACCEPTED',
    pickup,
    destination,
    driver: DEMO_DRIVERS[0],
    progress: 0,
  };

  it('computes the approach and trip routes from the same geometry', () => {
    const approach = approachRoute(offered);
    const trip = tripRoute(offered);
    expect(approach).not.toBeNull();
    expect(trip).not.toBeNull();
    expect(approach?.[0]).toEqual(vehicleStart(DEMO_DRIVERS[0], DEMO_PICKUP_COORDS));
    expect(trip?.[trip.length - 1]).toEqual(DEMO_DESTINATION_COORDS);
    expect(approach?.length).toBeGreaterThan(3);
    expect(trip?.length).toBeGreaterThan(3);
  });
});

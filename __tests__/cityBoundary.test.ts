import { DEMO_DESTINATION_COORDS, DEMO_PICKUP_COORDS } from '../src/booking/geo';
import { routeBetween } from '../src/booking/router';
import {
  ANGELES_CITY_BOUNDARY,
  isAngelesCityPoint,
  isRouteInsideGeometry,
  isRouteInsideAngelesCity,
  isPointInsideGeometry,
  type CityBoundaryGeometry,
} from '../src/booking/cityBoundary';
import type { LatLng } from '../src/booking/bookingMachine';

const polygonWithHole: CityBoundaryGeometry = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
      [0, 0],
    ],
    [
      [1, 1],
      [1, 3],
      [3, 3],
      [3, 1],
      [1, 1],
    ],
  ],
};

describe('city boundary geometry', () => {
  it('uses GeoJSON longitude-latitude coordinates at the parser boundary', () => {
    expect(isPointInsideGeometry({ latitude: 2, longitude: 0.5 }, polygonWithHole)).toBe(true);
    expect(isPointInsideGeometry({ latitude: 0.5, longitude: 2 }, polygonWithHole)).toBe(true);
  });

  it('includes outer and hole edges while excluding the hole interior', () => {
    expect(isPointInsideGeometry({ latitude: 2, longitude: 0 }, polygonWithHole)).toBe(true);
    expect(isPointInsideGeometry({ latitude: 2, longitude: 1 }, polygonWithHole)).toBe(true);
    expect(isPointInsideGeometry({ latitude: 2, longitude: 2 }, polygonWithHole)).toBe(false);
  });

  it('supports a multipolygon with disconnected components', () => {
    const multipolygon: CityBoundaryGeometry = {
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        [[[3, 3], [4, 3], [4, 4], [3, 4], [3, 3]]],
      ],
    };
    expect(isPointInsideGeometry({ latitude: 0.5, longitude: 0.5 }, multipolygon)).toBe(true);
    expect(isPointInsideGeometry({ latitude: 3.5, longitude: 3.5 }, multipolygon)).toBe(true);
    expect(isPointInsideGeometry({ latitude: 2, longitude: 2 }, multipolygon)).toBe(false);
  });

  it('rejects non-finite and out-of-range points', () => {
    expect(isPointInsideGeometry({ latitude: Number.NaN, longitude: 0.5 }, polygonWithHole)).toBe(false);
    expect(isPointInsideGeometry({ latitude: 91, longitude: 0.5 }, polygonWithHole)).toBe(false);
    expect(isPointInsideGeometry({ latitude: 0.5, longitude: 181 }, polygonWithHole)).toBe(false);
  });

  it('checks points between route vertices so a route cannot cross a hole', () => {
    const route: LatLng[] = [
      { latitude: 2, longitude: 0.5 },
      { latitude: 2, longitude: 3.5 },
    ];
    expect(isPointInsideGeometry(route[0], polygonWithHole)).toBe(true);
    expect(isPointInsideGeometry(route[1], polygonWithHole)).toBe(true);
    expect(isRouteInsideGeometry(route, polygonWithHole)).toBe(false);
  });

  it('rejects a route with an endpoint outside even when the other endpoint is inside', () => {
    expect(
      isRouteInsideGeometry(
        [
          { latitude: 2, longitude: 0.5 },
          { latitude: 2, longitude: 5 },
        ],
        polygonWithHole,
      ),
    ).toBe(false);
  });

  it('accepts a route fully inside the jurisdiction polygon', () => {
    expect(
      isRouteInsideGeometry(
        [
          { latitude: 0.5, longitude: 0.5 },
          { latitude: 0.5, longitude: 3.5 },
          { latitude: 3.5, longitude: 3.5 },
        ],
        polygonWithHole,
      ),
    ).toBe(true);
  });
});

describe('Angeles City mapped boundary', () => {
  it('identifies the supported demo locations as inside and Manila as outside', () => {
    expect(isAngelesCityPoint(DEMO_PICKUP_COORDS)).toBe(true);
    expect(isAngelesCityPoint(DEMO_DESTINATION_COORDS)).toBe(true);
    expect(isAngelesCityPoint({ latitude: 14.5995, longitude: 120.9842 })).toBe(false);
  });

  it('contains the default presentation route', () => {
    expect(isRouteInsideAngelesCity([DEMO_PICKUP_COORDS, DEMO_DESTINATION_COORDS])).toBe(true);
  });

  it('contains the route geometry produced by the bundled road router', () => {
    const route = routeBetween(DEMO_PICKUP_COORDS, DEMO_DESTINATION_COORDS);
    expect(route.source).toBe('road-network');
    expect(isRouteInsideAngelesCity(route.points)).toBe(true);
  });

  it('records its mapped-data provenance and represented year', () => {
    expect(ANGELES_CITY_BOUNDARY.source).toContain('geoBoundaries');
    expect(ANGELES_CITY_BOUNDARY.source).toContain('NAMRIA');
    expect(ANGELES_CITY_BOUNDARY.id).toBe('30758251B17687282333707');
    expect(ANGELES_CITY_BOUNDARY.year).toBe('2020');
  });

  it('loads a closed, in-range WGS84 polygon with no unverified interior rings', () => {
    expect(ANGELES_CITY_BOUNDARY.geometry.type).toBe('Polygon');
    if (ANGELES_CITY_BOUNDARY.geometry.type !== 'Polygon') return;
    expect(ANGELES_CITY_BOUNDARY.geometry.coordinates).toHaveLength(1);
    for (const ring of ANGELES_CITY_BOUNDARY.geometry.coordinates) {
      expect(ring.length).toBeGreaterThanOrEqual(4);
      expect(ring[0]).toEqual(ring[ring.length - 1]);
      for (const [longitude, latitude] of ring) {
        expect(Number.isFinite(longitude)).toBe(true);
        expect(Number.isFinite(latitude)).toBe(true);
        expect(longitude).toBeGreaterThanOrEqual(-180);
        expect(longitude).toBeLessThanOrEqual(180);
        expect(latitude).toBeGreaterThanOrEqual(-90);
        expect(latitude).toBeLessThanOrEqual(90);
      }
    }
  });
});

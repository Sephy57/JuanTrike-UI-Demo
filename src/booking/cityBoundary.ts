import type { LatLng } from './bookingMachine';
import boundaryData from '../data/angelesCityBoundary.json';
import { haversineKm } from './geo';

/** GeoJSON stores positions as longitude, latitude (WGS84 / CRS84 order). */
export type BoundaryPosition = readonly [longitude: number, latitude: number, ...extra: number[]];

export type CityBoundaryGeometry =
  | { type: 'Polygon'; coordinates: BoundaryPosition[][] }
  | { type: 'MultiPolygon'; coordinates: BoundaryPosition[][][] };

interface BoundaryFeatureCollection {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    properties: { shapeName: string; shapeID: string; shapeGroup: string; shapeType: string };
    geometry: CityBoundaryGeometry;
  }[];
}

const importedBoundary = boundaryData as unknown as BoundaryFeatureCollection;
const boundaryFeature = importedBoundary.features[0];

export const ANGELES_CITY_BOUNDARY = {
  name: boundaryFeature.properties.shapeName,
  id: boundaryFeature.properties.shapeID,
  year: '2020',
  source: 'geoBoundaries gbOpen PHL ADM3; inputs listed as NAMRIA, PSA, and OCHA Philippines',
  sourceUrl: 'https://www.geoboundaries.org/',
  license: 'CC BY 4.0 (geoBoundaries); source metadata lists CC BY 3.0 IGO',
  geometry: boundaryFeature.geometry,
} as const;

/** Mapped city-jurisdiction check. This is indicative mapping, not an LGU legal determination. */
export function isAngelesCityPoint(point: LatLng): boolean {
  return isPointInsideGeometry(point, ANGELES_CITY_BOUNDARY.geometry);
}

/** Returns true when the full displayed polyline remains inside the supplied boundary. */
export function isRouteInsideAngelesCity(points: LatLng[]): boolean {
  return isRouteInsideGeometry(points, ANGELES_CITY_BOUNDARY.geometry);
}

/** Point-in-Polygon for GeoJSON Polygon and MultiPolygon, including ring edges. */
export function isPointInsideGeometry(point: LatLng, geometry: CityBoundaryGeometry): boolean {
  if (!isValidPoint(point)) return false;
  if (geometry.type === 'Polygon') return polygonContains(point, geometry.coordinates);
  return geometry.coordinates.some((polygon) => polygonContains(point, polygon));
}

/** Samples every route segment at 10 m intervals to catch concavities and holes between vertices. */
export function isRouteInsideGeometry(
  points: LatLng[],
  geometry: CityBoundaryGeometry,
  maxSampleMeters = 10,
): boolean {
  if (points.length < 2 || !Number.isFinite(maxSampleMeters) || maxSampleMeters <= 0) return false;
  if (points.some((point) => !isValidPoint(point))) return false;

  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1];
    const to = points[i];
    const distanceMetres = haversineKm(from, to) * 1000;
    const steps = Math.max(1, Math.ceil(distanceMetres / maxSampleMeters));
    for (let step = 0; step <= steps; step += 1) {
      const fraction = step / steps;
      const sample = {
        latitude: from.latitude + (to.latitude - from.latitude) * fraction,
        longitude: from.longitude + (to.longitude - from.longitude) * fraction,
      };
      if (!isPointInsideGeometry(sample, geometry)) return false;
    }
  }
  return true;
}

function isValidPoint(point: LatLng): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

type RingLocation = 'outside' | 'inside' | 'boundary';

function polygonContains(point: LatLng, rings: BoundaryPosition[][]): boolean {
  if (rings.length === 0) return false;
  const outer = ringLocation(point, rings[0]);
  if (outer === 'outside') return false;
  if (outer === 'boundary') return true;

  for (let i = 1; i < rings.length; i += 1) {
    const hole = ringLocation(point, rings[i]);
    if (hole === 'boundary') return true;
    if (hole === 'inside') return false;
  }
  return true;
}

function ringLocation(point: LatLng, ring: BoundaryPosition[]): RingLocation {
  if (ring.length < 4) return 'outside';
  const x = point.longitude;
  const y = point.latitude;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const ax = ring[j][0];
    const ay = ring[j][1];
    const bx = ring[i][0];
    const by = ring[i][1];
    if (pointOnSegment(x, y, ax, ay, bx, by)) return 'boundary';

    const intersects = ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax;
    if (intersects) inside = !inside;
  }
  return inside ? 'inside' : 'outside';
}

function pointOnSegment(x: number, y: number, ax: number, ay: number, bx: number, by: number): boolean {
  const epsilon = 1e-10;
  const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);
  if (Math.abs(cross) > epsilon) return false;
  return (
    x >= Math.min(ax, bx) - epsilon &&
    x <= Math.max(ax, bx) + epsilon &&
    y >= Math.min(ay, by) - epsilon &&
    y <= Math.max(ay, by) + epsilon
  );
}

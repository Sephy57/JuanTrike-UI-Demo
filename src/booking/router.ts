// Offline road-following router for the JuanTrike demo.
//
// The graph in `src/data/roadGraph.json` is a crop of OpenStreetMap (ODbL)
// produced by `tools/extract-roads.mjs`. Routing runs entirely on the device:
// no OSRM, no Overpass, no network of any kind. It is DEMO geometry — it is not
// a validated tricycle profile and it does not confer any right to use a road.
//
// When a point is too far from the bundled network (or the graph cannot join
// the two points) the router returns the clearly labelled illustrative path so
// the UI never pretends a road route exists where it does not.
import type { LatLng } from './bookingMachine';
import { haversineKm, simulatedRoute } from './geo';
import roadGraph from '../data/roadGraph.json';

export type RouteSource = 'road-network' | 'illustrative';

export interface RouteResult {
  /** Polyline from `from` to `to`, always at least two points. */
  points: LatLng[];
  /** Length of `points` along the drawn path. */
  distanceKm: number;
  /** Which geometry produced this route. */
  source: RouteSource;
  /** How far (metres) the endpoints had to move to reach the graph. */
  snapMetres: number;
}

interface Graph {
  lat: Float64Array;
  lon: Float64Array;
  /** CSR offsets: `start[i]..start[i+1]` index into `to`/`weight`. */
  start: Int32Array;
  to: Int32Array;
  weight: Float64Array;
  bbox: [number, number, number, number];
}

/** Longest endpoint snap the router will accept before falling back. */
export const MAX_SNAP_M = 400;
const MAX_CACHE = 96;

let graph: Graph | null = null;
const cache = new Map<string, RouteResult>();

function buildGraph(): Graph | null {
  const raw = roadGraph as unknown as {
    coords?: number[];
    edges?: number[];
    bbox?: [number, number, number, number];
  };
  const coords = raw.coords;
  const edges = raw.edges;
  if (!coords || !edges || coords.length < 4 || edges.length < 2) return null;

  const n = coords.length / 2;
  const deg = new Int32Array(n);
  for (let k = 0; k < edges.length; k += 2) {
    deg[edges[k]] += 1;
    deg[edges[k + 1]] += 1;
  }
  const start = new Int32Array(n + 1);
  for (let i = 0; i < n; i += 1) start[i + 1] = start[i] + deg[i];

  const cursor = start.slice(0, n);
  const to = new Int32Array(start[n]);
  const weight = new Float64Array(start[n]);
  const lat = new Float64Array(n);
  const lon = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    lat[i] = coords[i * 2];
    lon[i] = coords[i * 2 + 1];
  }
  const pt = (i: number): LatLng => ({ latitude: lat[i], longitude: lon[i] });
  for (let k = 0; k < edges.length; k += 2) {
    const a = edges[k];
    const b = edges[k + 1];
    const w = haversineKm(pt(a), pt(b)) * 1000;
    const ia = cursor[a];
    to[ia] = b;
    weight[ia] = w;
    cursor[a] += 1;
    const ib = cursor[b];
    to[ib] = a;
    weight[ib] = w;
    cursor[b] += 1;
  }
  return { lat, lon, start, to, weight, bbox: raw.bbox ?? [0, 0, 0, 0] };
}

function getGraph(): Graph | null {
  if (!graph) graph = buildGraph();
  return graph;
}

function pointAt(g: Graph, i: number): LatLng {
  return { latitude: g.lat[i], longitude: g.lon[i] };
}

/** Resets the memoised graph and route cache (used by tests and demo reset). */
export function resetRouter(): void {
  graph = null;
  cache.clear();
}

export function routeCacheSize(): number {
  return cache.size;
}

/** Metres between two points, as used by the snap checks. */
function metres(a: LatLng, b: LatLng): number {
  return haversineKm(a, b) * 1000;
}

/** Nearest graph node to `point`, and its distance in metres. */
function nearestNode(g: Graph, point: LatLng): { index: number; metres: number } {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < g.lat.length; i += 1) {
    const dLat = g.lat[i] - point.latitude;
    const dLon = g.lon[i] - point.longitude;
    // Cheap planar pre-filter: exact haversine only for the current best.
    const approx = Math.hypot(dLat * 111000, dLon * 108000);
    if (approx >= bestD) continue;
    const exact = metres(point, { latitude: g.lat[i], longitude: g.lon[i] });
    if (exact < bestD) {
      bestD = exact;
      best = i;
    }
  }
  return { index: best, metres: bestD };
}

/** Binary min-heap keyed by f-score. */
class Heap {
  private ids: number[] = [];
  private keys: number[] = [];

  get size(): number {
    return this.ids.length;
  }

  push(id: number, key: number): void {
    this.ids.push(id);
    this.keys.push(key);
    let i = this.ids.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= this.keys[i]) break;
      this.swap(i, p);
      i = p;
    }
  }

  pop(): number {
    const top = this.ids[0];
    const lastId = this.ids.pop() as number;
    const lastKey = this.keys.pop() as number;
    if (this.ids.length > 0) {
      this.ids[0] = lastId;
      this.keys[0] = lastKey;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.ids.length && this.keys[l] < this.keys[m]) m = l;
        if (r < this.ids.length && this.keys[r] < this.keys[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.ids[a], this.ids[b]] = [this.ids[b], this.ids[a]];
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
  }
}

/** A* over the bundled graph. Returns the node path, or null when unreachable. */
function astar(g: Graph, from: number, to: number): number[] | null {
  const n = g.lat.length;
  const gScore = new Float64Array(n).fill(Infinity);
  const cameFrom = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const goalLat = g.lat[to];
  const goalLon = g.lon[to];
  const heuristic = (i: number) => haversineKm(pointAt(g, i), { latitude: goalLat, longitude: goalLon }) * 1000;

  const open = new Heap();
  gScore[from] = 0;
  open.push(from, heuristic(from));

  while (open.size > 0) {
    const current = open.pop();
    if (closed[current]) continue;
    if (current === to) break;
    closed[current] = 1;
    for (let e = g.start[current]; e < g.start[current + 1]; e += 1) {
      const next = g.to[e];
      if (closed[next]) continue;
      const tentative = gScore[current] + g.weight[e];
      if (tentative >= gScore[next]) continue;
      cameFrom[next] = current;
      gScore[next] = tentative;
      open.push(next, tentative + heuristic(next));
    }
  }

  if (cameFrom[to] === -1 && from !== to) return null;
  const path: number[] = [];
  let at = to;
  while (at !== -1) {
    path.push(at);
    if (at === from) break;
    at = cameFrom[at];
  }
  path.reverse();
  return path[0] === from ? path : null;
}

function cacheKey(from: LatLng, to: LatLng): string {
  const q = (v: number) => Math.round(v * 1e5);
  return `${q(from.latitude)},${q(from.longitude)}|${q(to.latitude)},${q(to.longitude)}`;
}

function illustrative(from: LatLng, to: LatLng): RouteResult {
  const points = simulatedRoute(from, to);
  return { points, distanceKm: polylineLengthKm(points), source: 'illustrative', snapMetres: 0 };
}

/**
 * Route between two points. Prefers the bundled OSM road network; falls back to
 * the clearly-labelled illustrative path when the points are off-network.
 * Deterministic: the same inputs always produce the same polyline.
 */
export function routeBetween(from: LatLng, to: LatLng): RouteResult {
  const key = cacheKey(from, to);
  const hit = cache.get(key);
  if (hit) return hit;

  const result = computeRoute(from, to);
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, result);
  return result;
}

function computeRoute(from: LatLng, to: LatLng): RouteResult {
  const g = getGraph();
  if (!g || g.lat.length === 0) return illustrative(from, to);

  const [minLon, minLat, maxLon, maxLat] = g.bbox;
  const inside = (p: LatLng) =>
    p.longitude >= minLon && p.longitude <= maxLon && p.latitude >= minLat && p.latitude <= maxLat;
  if (!inside(from) || !inside(to)) return illustrative(from, to);

  const a = nearestNode(g, from);
  const b = nearestNode(g, to);
  if (a.index < 0 || b.index < 0) return illustrative(from, to);
  const snap = Math.max(a.metres, b.metres);
  if (snap > MAX_SNAP_M) return illustrative(from, to);

  const path = astar(g, a.index, b.index);
  if (!path || path.length < 1) return illustrative(from, to);

  const points: LatLng[] = [{ latitude: from.latitude, longitude: from.longitude }];
  for (const node of path) points.push({ latitude: g.lat[node], longitude: g.lon[node] });
  points.push({ latitude: to.latitude, longitude: to.longitude });

  // Consecutive identical points (the snap may land on the endpoint itself)
  // would create zero-length segments in the interpolation maths.
  const deduped = points.filter(
    (p, i) => i === 0 || metres(p, points[i - 1]) > 0.5,
  );
  if (deduped.length < 2) return illustrative(from, to);

  return {
    points: deduped,
    distanceKm: polylineLengthKm(deduped),
    source: 'road-network',
    snapMetres: Math.round(snap),
  };
}

function polylineLengthKm(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += haversineKm(points[i - 1], points[i]);
  return total;
}

/** Static graph summary for the docs and the offline banner. */
export function roadGraphInfo(): { nodes: number; edges: number; km: number } {
  const raw = roadGraph as unknown as { nodeCount?: number; edgeCount?: number; lengthM?: number };
  return {
    nodes: raw.nodeCount ?? 0,
    edges: raw.edgeCount ?? 0,
    km: (raw.lengthM ?? 0) / 1000,
  };
}

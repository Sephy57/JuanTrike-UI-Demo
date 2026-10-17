#!/usr/bin/env node
/**
 * Extracts a compact, drivable OpenStreetMap road graph for the JuanTrike demo
 * area (Angeles City, Pampanga) and writes it to `src/data/roadGraph.json`.
 *
 * The graph is bundled with the app so route drawing works with no network at
 * all (no OSRM, no Overpass, no CDN). It is DEMO geometry only: it is not a
 * validated tricycle routing profile and carries no authority over any route.
 *
 * Source: OpenStreetMap via the public API (`/api/0.6/map`), ODbL.
 * Re-run:  node tools/extract-roads.mjs
 *
 * Options (env):
 *   JT_MINLON JT_MINLAT JT_MAXLON JT_MAXLAT   bounding box (degrees)
 *   JT_OUT                                    output path
 *   JT_TOLERANCE                              Douglas-Peucker tolerance (metres)
 *   JT_FETCH=0                                reuse tools/cache/osm-tiles.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(__dirname, 'cache');

const MIN_LON = num(process.env.JT_MINLON, 120.570);
const MIN_LAT = num(process.env.JT_MINLAT, 15.110);
const MAX_LON = num(process.env.JT_MAXLON, 120.622);
const MAX_LAT = num(process.env.JT_MAXLAT, 15.182);
const OUT = process.env.JT_OUT ?? path.join(ROOT, 'src', 'data', 'roadGraph.json');
const TOLERANCE_M = num(process.env.JT_TOLERANCE, 6);
const FETCH = process.env.JT_FETCH !== '0';
const UA = 'JuanTrike-POC/1.0 (standalone demo route bundling)';

/** Highway classes we treat as drivable for the synthetic demo. */
const DRIVABLE = new Set([
  'motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link',
  'secondary', 'secondary_link', 'tertiary', 'tertiary_link', 'unclassified',
  'residential', 'living_street', 'service', 'road',
]);

function num(v, fallback) {
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function log(...args) {
  console.log(new Date().toISOString().slice(11, 19), ...args);
}

// ---------------------------------------------------------------- fetch tiles

async function fetchTiles() {
  fs.mkdirSync(CACHE, { recursive: true });
  const cachePath = path.join(CACHE, 'osm-tiles.json');
  if (!FETCH && fs.existsSync(cachePath)) {
    log('reusing cached tiles from', cachePath);
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }

  // The OSM API refuses a /map request that returns more than 50 000 nodes, so
  // the area is requested as a grid of small tiles that subdivide on demand.
  const TILE_LON = 0.010;
  const TILE_LAT = 0.012;
  const tiles = [];
  for (let lon = MIN_LON; lon < MAX_LON - 1e-9; lon += TILE_LON) {
    for (let lat = MIN_LAT; lat < MAX_LAT - 1e-9; lat += TILE_LAT) {
      tiles.push([
        lon,
        lat,
        Math.min(lon + TILE_LON, MAX_LON),
        Math.min(lat + TILE_LAT, MAX_LAT),
      ]);
    }
  }
  log(`fetching ${tiles.length} OSM map tiles…`);

  const nodes = new Map();
  const ways = new Map();
  for (let i = 0; i < tiles.length; i += 1) {
    const xmls = await fetchBbox(...tiles[i], 0);
    for (const xml of xmls) mergeOsmXml(xml, nodes, ways);
    log(
      `  tile ${i + 1}/${tiles.length} -> ${nodes.size} nodes, ${ways.size} ways` +
        (xmls.length > 1 ? ` (${xmls.length} sub-requests)` : ''),
    );
    await sleep(1000);
  }

  const packed = {
    fetchedAt: new Date().toISOString(),
    bbox: [MIN_LON, MIN_LAT, MAX_LON, MAX_LAT],
    nodes: [...nodes].map(([id, n]) => [id, n.lat, n.lon]),
    ways: [...ways].map(([id, w]) => ({ id, tags: w.tags, nodes: w.nodes })),
  };
  fs.writeFileSync(cachePath, JSON.stringify(packed));
  log('cached tiles ->', cachePath);
  return packed;
}

/**
 * Fetches one bbox, recursively splitting it into quadrants when the API
 * reports the node limit. Returns the list of XML documents that cover it.
 */
async function fetchBbox(a, b, c, d, depth) {
  const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${a.toFixed(6)},${b.toFixed(6)},${c.toFixed(6)},${d.toFixed(6)}`;
  const res = await fetchOnce(url);
  if (res.status !== 400 || !res.body.includes('too many nodes') || depth >= 6) {
    if (!res.ok) throw new Error(`OSM API ${res.status}: ${res.body.slice(0, 200)}`);
    return [res.body];
  }
  const mlon = (a + c) / 2;
  const mlat = (b + d) / 2;
  log(`  subdividing depth ${depth + 1} (${c - a > 1e-6 && d - b > 1e-6 ? 'quad' : 'strip'})`);
  const out = [];
  for (const q of [
    [a, b, mlon, mlat],
    [mlon, b, c, mlat],
    [a, mlat, mlon, d],
    [mlon, mlat, c, d],
  ]) {
    if (q[2] - q[0] < 1e-7 || q[3] - q[1] < 1e-7) continue;
    out.push(...(await fetchBbox(...q, depth + 1)));
    await sleep(800);
  }
  return out;
}

async function fetchOnce(url) {
  let lastErr;
  for (let i = 0; i < 4; i += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/xml' } });
      const body = await res.text();
      // 429 / transient 5xx are worth retrying; a deterministic 400 is not.
      if (res.ok || res.status === 400) return { ok: res.ok, status: res.status, body };
      lastErr = new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    } catch (err) {
      lastErr = err;
    }
    log('  retry', i + 1, String(lastErr && lastErr.message));
    await sleep(3000 * (i + 1));
  }
  throw lastErr;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Parses `key="value"` pairs out of a single XML tag. */
function attrs(tag) {
  const out = {};
  const re = /([\w:-]+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(tag))) out[m[1]] = m[2];
  return out;
}

/** Minimal OSM XML reader: enough for `<node>`, `<way>` and `<nd>`. */
function mergeOsmXml(xml, nodes, ways) {
  const nodeRe = /<node\s([^>]*?)(?:\/>|>([\s\S]*?)<\/node>)/g;
  let m;
  while ((m = nodeRe.exec(xml))) {
    const a = attrs(m[1]);
    if (a.id === undefined || a.lat === undefined || a.lon === undefined) continue;
    const id = Number(a.id);
    if (!nodes.has(id)) nodes.set(id, { lat: Number(a.lat), lon: Number(a.lon) });
  }
  const wayRe = /<way\s([^>]*?)>([\s\S]*?)<\/way>/g;
  while ((m = wayRe.exec(xml))) {
    const a = attrs(m[1]);
    if (a.id === undefined) continue;
    const id = Number(a.id);
    if (ways.has(id)) continue;
    const body = m[2];
    const refs = [];
    const ndRe = /<nd\s([^>]*?)\/?>/g;
    let n;
    while ((n = ndRe.exec(body))) {
      const ref = attrs(n[1]).ref;
      if (ref !== undefined) refs.push(Number(ref));
    }
    const tags = {};
    const tagRe = /<tag\s([^>]*?)\/?>/g;
    let t;
    while ((t = tagRe.exec(body))) {
      const at = attrs(t[1]);
      if (at.k !== undefined) tags[at.k] = at.v ?? '';
    }
    if (refs.length > 1) ways.set(id, { tags, nodes: refs });
  }
}

// ------------------------------------------------------------------- geometry

function haversineM(a, b) {
  const R = 6371008.8;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function perpendicularDistanceM(p, a, b) {
  // Local equirectangular projection around p is accurate at this scale.
  const kx = Math.cos((p[0] * Math.PI) / 180) * 111320;
  const ky = 110540;
  const px = 0;
  const py = 0;
  const ax = (a[1] - p[1]) * kx;
  const ay = (a[0] - p[0]) * ky;
  const bx = (b[1] - p[1]) * kx;
  const by = (b[0] - p[0]) * ky;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(ax - px, ay - py);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Douglas-Peucker on a lat/lon polyline, tolerance in metres. */
function simplify(points, toleranceM) {
  if (points.length <= 2) return points;
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxDist = -1;
    let idx = -1;
    for (let i = s + 1; i < e; i += 1) {
      const d = perpendicularDistanceM(points[i], points[s], points[e]);
      if (d > maxDist) {
        maxDist = d;
        idx = i;
      }
    }
    if (maxDist > toleranceM && idx > 0) {
      keep[idx] = true;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function inBbox(p) {
  return p[0] >= MIN_LAT && p[0] <= MAX_LAT && p[1] >= MIN_LON && p[1] <= MAX_LON;
}

/**
 * Reduces a road graph to its junctions plus a simplified shape for each strand
 * between them. Every node with degree != 2 is kept, so branches, crossings and
 * dead ends survive exactly; only the shape of each in-between chain is thinned.
 */
function contract(rawCoords, rawEdges, toleranceM) {
  const n = rawCoords.length / 2;
  const adj = Array.from({ length: n }, () => []);
  for (let k = 0; k < rawEdges.length; k += 2) {
    const a = rawEdges[k];
    const b = rawEdges[k + 1];
    adj[a].push(b);
    adj[b].push(a);
  }
  const anchor = (i) => adj[i].length !== 2;

  const seen = new Set();
  const mark = (u, v) => {
    seen.add(`${u}>${v}`);
    seen.add(`${v}>${u}`);
  };
  const outEdges = [];
  const emitted = new Set();
  const push = (a, b) => {
    if (a === undefined || b === undefined || a === b) return;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (emitted.has(key)) return;
    emitted.add(key);
    outEdges.push(a, b);
  };

  const emit = (path, simplifyShape) => {
    if (path.length < 2) return;
    const closed = path[0] === path[path.length - 1];
    if (closed || !simplifyShape || path.length === 2) {
      for (let i = 1; i < path.length; i += 1) push(path[i - 1], path[i]);
      return;
    }
    const line = path.map((node) => [rawCoords[node * 2], rawCoords[node * 2 + 1]]);
    const byRef = new Map(line.map((p, i) => [p, path[i]]));
    const simple = simplify(line, toleranceM);
    const chain = simple.map((p) => byRef.get(p));
    for (let i = 1; i < chain.length; i += 1) push(chain[i - 1], chain[i]);
  };

  /** Walks from `start` towards `next` until a junction is reached. */
  const walk = (start, next) => {
    const path = [start];
    const onPath = new Set([start]);
    let prev = start;
    let cur = next;
    mark(prev, cur);
    while (path.length <= n) {
      path.push(cur);
      onPath.add(cur);
      if (anchor(cur)) break;
      const a = adj[cur][0];
      const b = adj[cur][1];
      const nxt = a !== prev ? a : b;
      if (nxt === undefined || nxt === cur) break;
      mark(cur, nxt);
      if (onPath.has(nxt)) {
        path.push(nxt); // closed strand: finish on the node we started from
        break;
      }
      prev = cur;
      cur = nxt;
    }
    return path;
  };

  for (let u = 0; u < n; u += 1) {
    if (!anchor(u)) continue;
    for (const v of adj[u]) {
      if (seen.has(`${u}>${v}`)) continue;
      emit(walk(u, v), true);
    }
  }

  // Strands with no junction at all (an isolated closed way) are kept intact.
  for (let u = 0; u < n; u += 1) {
    for (const v of adj[u]) {
      if (seen.has(`${u}>${v}`)) continue;
      emit(walk(u, v), false);
    }
  }

  return { coords: rawCoords, edges: outEdges };
}

// --------------------------------------------------------------------- build

function buildGraph(osm) {
  const nodeById = new Map();
  for (const [id, lat, lon] of osm.nodes) nodeById.set(id, { lat, lon });

  // 1. Collect drivable ways that are fully inside the requested bbox.
  const ways = [];
  for (const way of osm.ways) {
    if (!DRIVABLE.has(way.tags.highway)) continue;
    if (way.tags.access === 'private' || way.tags.access === 'no') continue;
    const pts = [];
    let missing = 0;
    for (const ref of way.nodes) {
      const n = nodeById.get(ref);
      if (!n) {
        missing += 1;
        continue;
      }
      pts.push([n.lat, n.lon]);
    }
    if (missing > 0 && missing / way.nodes.length > 0.2) continue;
    if (pts.length < 2) continue;
    if (!pts.some(inBbox)) continue;
    ways.push({ id: way.id, pts, oneway: way.tags.oneway === 'yes' || way.tags.oneway === '1' });
  }
  log(`drivable ways kept: ${ways.length}`);

  // 2. Build the full graph first. Simplifying each way independently would
  //    delete nodes that another way branches from and shatter the network, so
  //    the geometry is simplified later on junction-to-junction chains only.
  const rounded = (p) => [Number(p[0].toFixed(5)), Number(p[1].toFixed(5))];
  const nodeIndex = new Map(); // "lat,lon" -> index
  const rawCoords = [];
  const rawEdges = [];
  const edgeSet = new Set();

  const intern = (p) => {
    const q = rounded(p);
    if (!inBbox(q)) return -1;
    const key = `${q[0]},${q[1]}`;
    let idx = nodeIndex.get(key);
    if (idx === undefined) {
      idx = rawCoords.length / 2;
      rawCoords.push(q[0], q[1]);
      nodeIndex.set(key, idx);
    }
    return idx;
  };

  const addEdge = (i, j, list) => {
    if (i < 0 || j < 0 || i === j) return;
    const key = i < j ? `${i}-${j}` : `${j}-${i}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    list.push(i, j);
  };

  for (const way of ways) {
    for (let k = 1; k < way.pts.length; k += 1) {
      addEdge(intern(way.pts[k - 1]), intern(way.pts[k]), rawEdges);
    }
  }

  // 3. Contract degree-2 chains between junctions, simplifying their shape.
  const { coords, edges } = contract(rawCoords, rawEdges, TOLERANCE_M);
  log(
    `contracted ${rawCoords.length / 2} nodes -> ${coords.length / 2} nodes, ` +
      `${edges.length / 2} edges`,
  );

  // 4. Drop isolated single nodes so the graph only contains routable strands.
  const degree = new Array(coords.length / 2).fill(0);
  for (let k = 0; k < edges.length; k += 2) {
    degree[edges[k]] += 1;
    degree[edges[k + 1]] += 1;
  }
  const remap = new Int32Array(degree.length).fill(-1);
  const keptCoords = [];
  for (let k = 0; k < degree.length; k += 1) {
    if (degree[k] === 0) continue;
    remap[k] = keptCoords.length / 2;
    keptCoords.push(coords[k * 2], coords[k * 2 + 1]);
  }
  const keptEdges = [];
  for (let k = 0; k < edges.length; k += 2) {
    const a = remap[edges[k]];
    const b = remap[edges[k + 1]];
    if (a >= 0 && b >= 0 && a !== b) keptEdges.push(a, b);
  }

  let lengthM = 0;
  for (let k = 0; k < keptEdges.length; k += 2) {
    const a = keptEdges[k];
    const b = keptEdges[k + 1];
    lengthM += haversineM(
      [keptCoords[a * 2], keptCoords[a * 2 + 1]],
      [keptCoords[b * 2], keptCoords[b * 2 + 1]],
    );
  }

  return { coords: keptCoords, edges: keptEdges, lengthM };
}

// ---------------------------------------------------------------------- main

async function main() {
  const osm = await fetchTiles();
  const graph = buildGraph(osm);
  const payload = {
    version: 1,
    source: 'OpenStreetMap contributors (ODbL) via api.openstreetmap.org /api/0.6/map',
    generatedAt: new Date().toISOString(),
    bbox: [MIN_LON, MIN_LAT, MAX_LON, MAX_LAT],
    toleranceM: TOLERANCE_M,
    nodeCount: graph.coords.length / 2,
    edgeCount: graph.edges.length / 2,
    lengthM: Math.round(graph.lengthM),
    coords: graph.coords,
    edges: graph.edges,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload));
  const bytes = fs.statSync(OUT).size;
  log(
    `wrote ${OUT} (${(bytes / 1024).toFixed(1)} KiB) — ${payload.nodeCount} nodes, ` +
      `${payload.edgeCount} edges, ${(payload.lengthM / 1000).toFixed(1)} km`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

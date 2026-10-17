#!/usr/bin/env node
// Extract the single Angeles City ADM3 feature from the geoBoundaries source file.
// Usage: node tools/extract-city-boundary.mjs <source.geojson> <output.geojson>
// Source metadata: geoBoundaries gbOpen PHL ADM3, represented year 2020.

import { readFile, writeFile } from 'node:fs/promises';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error('Usage: node tools/extract-city-boundary.mjs <source.geojson> <output.geojson>');
  process.exitCode = 2;
} else {
  const collection = JSON.parse(await readFile(inputPath, 'utf8'));
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
    throw new Error('Input is not a GeoJSON FeatureCollection.');
  }

  const matches = collection.features.filter((feature) =>
    feature?.properties?.shapeName === 'Angeles City' &&
    feature?.properties?.shapeGroup === 'PHL' &&
    feature?.properties?.shapeType === 'ADM3'
  );
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one Angeles City ADM3 feature; found ${matches.length}.`);
  }

  const feature = matches[0];
  validateGeometry(feature.geometry);
  const coordinates = allCoordinates(feature.geometry);
  const bounds = coordinates.reduce(
    (out, [lon, lat]) => [Math.min(out[0], lon), Math.min(out[1], lat), Math.max(out[2], lon), Math.max(out[3], lat)],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
  const result = { type: 'FeatureCollection', features: [feature] };
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    name: feature.properties.shapeName,
    shapeID: feature.properties.shapeID,
    sourceLevel: feature.properties.shapeType,
    geometryType: feature.geometry.type,
    polygonCount: feature.geometry.type === 'Polygon' ? 1 : feature.geometry.coordinates.length,
    ringSizes: ringSizes(feature.geometry),
    coordinatePairs: coordinates.length,
    boundsLonLat: bounds,
    outputPath,
  }, null, 2));
}

function validateGeometry(geometry) {
  if (geometry?.type === 'Polygon') {
    validatePolygon(geometry.coordinates);
    return;
  }
  if (geometry?.type === 'MultiPolygon' && Array.isArray(geometry.coordinates) && geometry.coordinates.length) {
    for (const polygon of geometry.coordinates) validatePolygon(polygon);
    return;
  }
  throw new Error(`Unsupported or empty boundary geometry: ${geometry?.type ?? 'missing'}.`);
}

function validatePolygon(rings) {
  if (!Array.isArray(rings) || rings.length === 0) throw new Error('Polygon has no exterior ring.');
  for (const ring of rings) {
    if (!Array.isArray(ring) || ring.length < 4) throw new Error('Polygon ring has fewer than four positions.');
    for (const position of ring) {
      const [lon, lat] = position ?? [];
      if (!Number.isFinite(lon) || !Number.isFinite(lat) || lon < -180 || lon > 180 || lat < -90 || lat > 90) {
        throw new Error('Polygon contains a non-finite or out-of-range WGS84 position.');
      }
    }
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) throw new Error('Polygon ring is not closed.');
    if (hasSelfIntersection(ring)) throw new Error('Polygon ring self-intersects.');
  }
}

function hasSelfIntersection(ring) {
  const edgeCount = ring.length - 1;
  for (let i = 0; i < edgeCount; i += 1) {
    for (let j = i + 1; j < edgeCount; j += 1) {
      if (j === i + 1 || (i === 0 && j === edgeCount - 1)) continue;
      if (segmentsIntersect(ring[i], ring[i + 1], ring[j], ring[j + 1])) return true;
    }
  }
  return false;
}

function segmentsIntersect(a, b, c, d) {
  const orient = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const on = (p, q, r) =>
    Math.abs(orient(p, q, r)) < 1e-12 &&
    r[0] >= Math.min(p[0], q[0]) - 1e-12 && r[0] <= Math.max(p[0], q[0]) + 1e-12 &&
    r[1] >= Math.min(p[1], q[1]) - 1e-12 && r[1] <= Math.max(p[1], q[1]) + 1e-12;
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if ((o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0)) return true;
  return on(a, b, c) || on(a, b, d) || on(c, d, a) || on(c, d, b);
}

function allCoordinates(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap((polygon) => polygon.flatMap((ring) => ring.map(([lon, lat]) => [lon, lat])));
}

function ringSizes(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map((polygon) => polygon.map((ring) => ring.length));
}

// Turns the current booking state into the polylines the map should draw.
//
// One shared implementation so Passenger and Driver modes can never disagree
// about the route on screen. Geometry comes from the bundled road graph; the
// layer set is deliberately tiny so the WebView only rebuilds a line when that
// line actually changed.
import type { RouteLayer } from '../components/MapView';
import { routeColors } from '../theme/tokens';
import type { DemoState } from './bookingMachine';
import { activeRouteResult, routeSplit } from './movement';

/** Layer ids, stable across ticks so the map can diff by id. */
export const LAYER_PREVIEW = 'route-preview';
export const LAYER_REMAINING = 'route-remaining';
export const LAYER_TRAVELED = 'route-traveled';

const PREVIEW = new Set(['LOCATIONS_SELECTED', 'BOOKING_REQUESTED', 'SEARCHING_DRIVER', 'DRIVER_OFFERED']);

/**
 * Map layers for the current status.
 * - Preview stages: one dashed line, pickup → destination.
 * - Moving stages: travelled (dim) + remaining (bright) so progress is readable.
 * - Other stages: the single active route, solid.
 */
export function buildRouteLayers(state: DemoState): RouteLayer[] {
  const result = activeRouteResult(state);
  if (!result || result.points.length < 2) return [];

  const layers: RouteLayer[] = [];
  if (PREVIEW.has(state.status)) {
    layers.push({
      id: LAYER_PREVIEW,
      points: result.points,
      color: routeColors.preview,
      width: 5,
      dashed: true,
      opacity: 0.9,
    });
    return layers;
  }

  const moving = state.status === 'DRIVER_ARRIVING' || state.status === 'TRIP_STARTED';
  const approach = state.status === 'DRIVER_ACCEPTED' || state.status === 'DRIVER_ARRIVING';
  const split = routeSplit(state);

  if (moving && split) {
    if (split.traveled.length > 1) {
      layers.push({ id: LAYER_TRAVELED, points: split.traveled, color: routeColors.traveled, width: 6, opacity: 0.8 });
    }
    if (split.remaining.length > 1) {
      layers.push({
        id: LAYER_REMAINING,
        points: split.remaining,
        color: approach ? routeColors.approach : routeColors.trip,
        width: 6,
      });
    }
    return layers;
  }

  layers.push({
    id: approach ? LAYER_REMAINING : LAYER_PREVIEW,
    points: result.points,
    color: approach ? routeColors.approach : routeColors.trip,
    width: 6,
  });
  return layers;
}

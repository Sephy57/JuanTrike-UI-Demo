// Simulated movement shared by Passenger and Driver modes. Presentation only.
//
// The vehicle always walks the same polyline that is drawn on the map: routes
// come from the bundled road graph (see `router.ts`), so the marker, the drawn
// line and the remaining-distance readout can never disagree. Progress itself
// is advanced only by the single TICK clock in DemoContext, so pause, resume,
// speed and reset apply to the visual movement exactly as they do to the state.
import type { DemoState, LatLng } from './bookingMachine';
import type { DemoDriver } from './demoZones';
import { DEMO_POLICY } from './demoZones';
import { headingAt, pointAlong, polylineKm, splitRoute } from './geo';
import { routeBetween, type RouteResult } from './router';

/** Where a driver's simulated vehicle starts, relative to the pickup point. */
export function vehicleStart(driver: DemoDriver, pickup: LatLng): LatLng {
  return {
    latitude: pickup.latitude + driver.startOffset.dLat,
    longitude: pickup.longitude + driver.startOffset.dLon,
  };
}

/** Route from the driver's start to pickup, used during DRIVER_ACCEPTED and DRIVER_ARRIVING. */
export function approachRoute(state: DemoState): LatLng[] | null {
  if (!state.driver || !state.pickup) return null;
  return routeBetween(vehicleStart(state.driver, state.pickup.coords), state.pickup.coords).points;
}

/** Route from pickup to destination, used during the trip. */
export function tripRoute(state: DemoState): LatLng[] | null {
  if (!state.pickup || !state.destination) return null;
  return routeBetween(state.pickup.coords, state.destination.coords).points;
}

/** Full route (driver start → pickup → destination) for the preview stage. */
export function previewRoute(state: DemoState): LatLng[] | null {
  if (!state.pickup || !state.destination) return null;
  return routeBetween(state.pickup.coords, state.destination.coords).points;
}

/** Route to draw on the map for the current status. */
export function activeRoute(state: DemoState): LatLng[] | null {
  return activeRouteResult(state)?.points ?? null;
}

/**
 * Routing result for the current status, including whether the geometry came
 * from the bundled road network or the labelled illustrative fallback. Cheap:
 * `routeBetween` memoises, so this is a lookup after the first call.
 */
export function activeRouteResult(state: DemoState): RouteResult | null {
  switch (state.status) {
    case 'LOCATIONS_SELECTED':
    case 'BOOKING_REQUESTED':
    case 'SEARCHING_DRIVER':
    case 'DRIVER_OFFERED':
      if (!state.pickup || !state.destination) return null;
      return routeBetween(state.pickup.coords, state.destination.coords);
    case 'DRIVER_ACCEPTED':
    case 'DRIVER_ARRIVING':
      if (!state.driver || !state.pickup) return null;
      return routeBetween(vehicleStart(state.driver, state.pickup.coords), state.pickup.coords);
    case 'DRIVER_ARRIVED':
    case 'TRIP_STARTED':
    case 'TRIP_COMPLETED':
      if (!state.pickup || !state.destination) return null;
      return routeBetween(state.pickup.coords, state.destination.coords);
    default:
      return null;
  }
}

/** Simulated vehicle position for the current status, or null when no vehicle is assigned. */
export function vehiclePosition(state: DemoState): LatLng | null {
  if (!state.driver || !state.pickup) return null;
  switch (state.status) {
    case 'DRIVER_ACCEPTED':
      return vehicleStart(state.driver, state.pickup.coords);
    case 'DRIVER_ARRIVING': {
      const route = approachRoute(state);
      return route ? pointAlong(route, state.progress) : null;
    }
    case 'DRIVER_ARRIVED':
      return state.pickup.coords;
    case 'TRIP_STARTED': {
      const route = tripRoute(state);
      return route ? pointAlong(route, state.progress) : null;
    }
    case 'TRIP_COMPLETED':
      return state.destination?.coords ?? null;
    default:
      return null;
  }
}

/**
 * Direction the vehicle is facing, in degrees (0 = north). Derived from the
 * displayed route at the current progress, so the icon never points off-route.
 */
export function vehicleHeading(state: DemoState): number | null {
  const moving = state.status === 'DRIVER_ARRIVING' || state.status === 'TRIP_STARTED';
  if (!moving) return null;
  const route = state.status === 'DRIVER_ARRIVING' ? approachRoute(state) : tripRoute(state);
  if (!route || route.length < 2) return null;
  return headingAt(route, state.progress);
}

/** The active route split into the part already travelled and the part ahead. */
export function routeSplit(state: DemoState): { traveled: LatLng[]; remaining: LatLng[] } | null {
  const route = activeRoute(state);
  if (!route) return null;
  const moving = state.status === 'DRIVER_ARRIVING' || state.status === 'TRIP_STARTED';
  if (!moving) return { traveled: [], remaining: route };
  return splitRoute(route, state.progress);
}

/** Remaining simulated demo seconds for the current approach or trip, or null when not moving. */
export function remainingSeconds(state: DemoState): number | null {
  if (state.status === 'DRIVER_ARRIVING') {
    return Math.max(0, Math.ceil((1 - state.progress) * DEMO_POLICY.APPROACH_SECONDS));
  }
  if (state.status === 'TRIP_STARTED') {
    return Math.max(0, Math.ceil((1 - state.progress) * DEMO_POLICY.TRIP_SECONDS));
  }
  return null;
}

/** Remaining simulated distance in metres for the current approach or trip, or null. */
export function remainingMetres(state: DemoState): number | null {
  const route =
    state.status === 'DRIVER_ARRIVING' ? approachRoute(state) : state.status === 'TRIP_STARTED' ? tripRoute(state) : null;
  if (!route) return null;
  return Math.round(polylineKm(route) * (1 - state.progress) * 1000);
}

/** Total length in metres of the route currently being driven, or null. */
export function routeLengthMetres(state: DemoState): number | null {
  const route = activeRoute(state);
  if (!route) return null;
  return Math.round(polylineKm(route) * 1000);
}

/** Distance already covered on the current route, in metres, or null. */
export function travelledMetres(state: DemoState): number | null {
  const route = activeRoute(state);
  if (!route) return null;
  return Math.round(polylineKm(route) * state.progress * 1000);
}

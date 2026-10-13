// Simulated movement shared by Passenger and Driver modes. Presentation only.
import type { DemoState, LatLng } from './bookingMachine';
import type { DemoDriver } from './demoZones';
import { DEMO_POLICY } from './demoZones';
import { pointAlong, polylineKm, simulatedRoute } from './geo';

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
  return simulatedRoute(vehicleStart(state.driver, state.pickup.coords), state.pickup.coords);
}

/** Route from pickup to destination, used during the trip. */
export function tripRoute(state: DemoState): LatLng[] | null {
  if (!state.pickup || !state.destination) return null;
  return simulatedRoute(state.pickup.coords, state.destination.coords);
}

/** Route to draw on the map for the current status. */
export function activeRoute(state: DemoState): LatLng[] | null {
  switch (state.status) {
    case 'LOCATIONS_SELECTED':
    case 'BOOKING_REQUESTED':
    case 'SEARCHING_DRIVER':
    case 'DRIVER_OFFERED':
      return tripRoute(state);
    case 'DRIVER_ACCEPTED':
    case 'DRIVER_ARRIVING':
      return approachRoute(state);
    case 'DRIVER_ARRIVED':
    case 'TRIP_STARTED':
    case 'TRIP_COMPLETED':
      return tripRoute(state);
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

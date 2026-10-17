// Deterministic local DEMO booking state machine.
// No network, no backend. Every transition goes through `transition()`.
import { DEMO_POLICY, DemoDriver, eligibleDrivers } from './demoZones';

export type BookingStatus =
  | 'IDLE'
  | 'LOCATIONS_SELECTED'
  | 'BOOKING_REQUESTED'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_OFFERED'
  | 'DRIVER_ACCEPTED'
  | 'DRIVER_ARRIVING'
  | 'DRIVER_ARRIVED'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'TRIP_CANCELLED';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Place {
  /** Demo label or a coordinate string. Never a fabricated street address. */
  label: string;
  coords: LatLng;
  source: 'demo' | 'gps' | 'map-tap';
}

export type PaymentStatus = 'PENDING' | 'COLLECTED_DEMO' | 'NOT_COLLECTED';

export interface Booking {
  id: string;
  passengerName: string;
  pickup: Place;
  destination: Place;
  distanceKm: number;
  fareDemo: number;
  requestedAt: number;
  driverName: string | null;
  /** Only cash is available in the demo. GCash and Maya are shown as unavailable. */
  paymentMethod: 'CASH';
  paymentStatus: PaymentStatus;
}

export interface TripRecord {
  id: string;
  pickupLabel: string;
  destinationLabel: string;
  distanceKm: number;
  fareDemo: number;
  outcome: 'COMPLETED' | 'CANCELLED';
  endedAt: number;
  driverName: string | null;
  paymentStatus: PaymentStatus;
}

export interface DispatchOffer {
  driver: DemoDriver;
  /** Seconds left to accept. Counts down with TICK events. */
  secondsLeft: number;
  /** 1-based offer number for this booking. */
  attempt: number;
}

export interface DemoState {
  status: BookingStatus;
  pickup: Place | null;
  destination: Place | null;
  booking: Booking | null;
  history: TripRecord[];
  /** Simulated movement progress 0..1 for the driver approach or the trip. */
  progress: number;
  /** Driver who accepted the current booking. */
  driver: DemoDriver | null;
  /** Current offer while DRIVER_OFFERED. */
  offer: DispatchOffer | null;
  /** Drivers who declined or let an offer expire for the current booking. */
  excludedDriverIds: string[];
  /** Offers made for the current booking. Capped by DEMO_POLICY.MAX_OFFER_ATTEMPTS. */
  attempts: number;
  lastOfferOutcome: 'DECLINED' | 'EXPIRED' | null;
  /** Why the last booking ended as cancelled. Null while active or completed. */
  cancelReason: 'PASSENGER' | 'NO_DRIVER' | null;
  /**
   * Demo seconds until the next automatic step: request -> search, or search -> offer.
   * Driven by TICK so every timed step pauses, resumes and speeds up with the same clock.
   */
  phaseRemaining: number;
}

export type DemoEvent =
  | { type: 'SET_PICKUP'; place: Place }
  | { type: 'SET_DESTINATION'; place: Place }
  | { type: 'CLEAR_LOCATIONS' }
  | { type: 'RESTORE_DEMO_LOCATIONS'; pickup: Place; destination: Place }
  | { type: 'CONFIRM_BOOKING'; id: string; now: number; distanceKm: number; fareDemo: number; passengerName?: string }
  | { type: 'BEGIN_SEARCH' }
  | { type: 'OFFER_TO_DRIVER'; now?: number }
  | { type: 'ACCEPT_BOOKING'; driverName: string }
  | { type: 'DECLINE_BOOKING' }
  | { type: 'OFFER_EXPIRED' }
  | { type: 'DRIVER_EN_ROUTE' }
  | { type: 'DRIVER_ARRIVED' }
  | { type: 'START_TRIP' }
  | { type: 'COMPLETE_TRIP'; now: number }
  | { type: 'CANCEL_BOOKING'; now: number }
  /**
   * Advances simulated time by `seconds` of demo time. Moves the request, search and offer
   * timers, and the vehicle. `driverOnline` gates the search: an offline driver never receives one.
   */
  | { type: 'TICK'; seconds: number; now?: number; driverOnline?: boolean }
  | { type: 'NEW_BOOKING' }
  | { type: 'RESET' };

const DISPATCH_RESET = {
  progress: 0,
  driver: null,
  offer: null,
  excludedDriverIds: [] as string[],
  attempts: 0,
  lastOfferOutcome: null,
  cancelReason: null,
  phaseRemaining: 0,
} as const;

export const initialDemoState: DemoState = {
  status: 'IDLE',
  pickup: null,
  destination: null,
  booking: null,
  history: [],
  ...DISPATCH_RESET,
};

const LOCATION_EDIT_STATES: BookingStatus[] = ['IDLE', 'LOCATIONS_SELECTED'];

/** States in which the passenger can still cancel an active booking. */
const CANCELLABLE_STATES: BookingStatus[] = [
  'BOOKING_REQUESTED',
  'SEARCHING_DRIVER',
  'DRIVER_OFFERED',
  'DRIVER_ACCEPTED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
];

function locationsStatus(pickup: Place | null, destination: Place | null): BookingStatus {
  return pickup && destination ? 'LOCATIONS_SELECTED' : 'IDLE';
}

/**
 * Pure transition function. Events that are not valid in the current status
 * return the state unchanged, so the UI can never reach an unsupported state.
 */
export function transition(state: DemoState, event: DemoEvent): DemoState {
  switch (event.type) {
    case 'SET_PICKUP':
      if (!LOCATION_EDIT_STATES.includes(state.status)) return state;
      return { ...state, pickup: event.place, status: locationsStatus(event.place, state.destination) };

    case 'SET_DESTINATION':
      if (!LOCATION_EDIT_STATES.includes(state.status)) return state;
      return { ...state, destination: event.place, status: locationsStatus(state.pickup, event.place) };

    case 'CLEAR_LOCATIONS':
      if (!LOCATION_EDIT_STATES.includes(state.status)) return state;
      return { ...state, pickup: null, destination: null, status: 'IDLE' };

    case 'RESTORE_DEMO_LOCATIONS':
      if (!LOCATION_EDIT_STATES.includes(state.status)) return state;
      return {
        ...state,
        pickup: event.pickup,
        destination: event.destination,
        status: 'LOCATIONS_SELECTED',
      };

    case 'CONFIRM_BOOKING':
      if (state.status !== 'LOCATIONS_SELECTED' || !state.pickup || !state.destination) return state;
      return {
        ...state,
        status: 'BOOKING_REQUESTED',
        phaseRemaining: DEMO_POLICY.REQUEST_SECONDS,
        booking: {
          id: event.id,
          passengerName: event.passengerName ?? 'Juan dela Cruz',
          pickup: state.pickup,
          destination: state.destination,
          distanceKm: event.distanceKm,
          fareDemo: event.fareDemo,
          requestedAt: event.now,
          driverName: null,
          paymentMethod: 'CASH',
          paymentStatus: 'PENDING',
        },
      };

    case 'BEGIN_SEARCH':
      if (state.status !== 'BOOKING_REQUESTED') return state;
      return { ...state, status: 'SEARCHING_DRIVER', phaseRemaining: DEMO_POLICY.SEARCH_SECONDS };

    case 'OFFER_TO_DRIVER': {
      if (state.status !== 'SEARCHING_DRIVER' || !state.booking) return state;
      const eligible = eligibleDrivers(state.booking.pickup.coords).filter(
        (driver) => !state.excludedDriverIds.includes(driver.id),
      );
      if (state.attempts >= DEMO_POLICY.MAX_OFFER_ATTEMPTS || eligible.length === 0) {
        return endBooking(state, event.now ?? 0, 'NO_DRIVER');
      }
      // FIFO: the first eligible driver in queue order receives the offer.
      const driver = eligible[0];
      return {
        ...state,
        status: 'DRIVER_OFFERED',
        offer: { driver, secondsLeft: DEMO_POLICY.OFFER_WINDOW_SECONDS, attempt: state.attempts + 1 },
        attempts: state.attempts + 1,
      };
    }

    case 'ACCEPT_BOOKING': {
      if (state.status !== 'DRIVER_OFFERED' || !state.booking || !state.offer) return state;
      const driver = state.offer.driver;
      return {
        ...state,
        status: 'DRIVER_ACCEPTED',
        driver,
        offer: null,
        progress: 0,
        booking: { ...state.booking, driverName: driver.name },
      };
    }

    case 'DECLINE_BOOKING':
      return declineOffer(state, 'DECLINED');

    case 'OFFER_EXPIRED':
      return declineOffer(state, 'EXPIRED');

    case 'DRIVER_EN_ROUTE':
      if (state.status !== 'DRIVER_ACCEPTED') return state;
      return { ...state, status: 'DRIVER_ARRIVING', progress: 0 };

    case 'DRIVER_ARRIVED':
      if (state.status !== 'DRIVER_ARRIVING') return state;
      return { ...state, status: 'DRIVER_ARRIVED', progress: 1 };

    case 'START_TRIP':
      if (state.status !== 'DRIVER_ARRIVED') return state;
      return { ...state, status: 'TRIP_STARTED', progress: 0 };

    case 'COMPLETE_TRIP': {
      if (state.status !== 'TRIP_STARTED' || !state.booking) return state;
      const booking: Booking = { ...state.booking, paymentStatus: 'COLLECTED_DEMO' };
      return {
        ...state,
        status: 'TRIP_COMPLETED',
        progress: 1,
        booking,
        offer: null,
        history: [toRecord(booking, 'COMPLETED', event.now), ...state.history],
      };
    }

    case 'CANCEL_BOOKING': {
      if (!CANCELLABLE_STATES.includes(state.status) || !state.booking) return state;
      return endBooking(state, event.now, 'PASSENGER');
    }

    case 'TICK':
      return tick(state, event.seconds, event.now ?? 0, event.driverOnline ?? true);

    case 'NEW_BOOKING':
      if (state.status !== 'TRIP_COMPLETED' && state.status !== 'TRIP_CANCELLED') return state;
      return {
        ...state,
        ...DISPATCH_RESET,
        excludedDriverIds: [],
        status: 'IDLE',
        booking: null,
        pickup: null,
        destination: null,
      };

    case 'RESET':
      return { ...initialDemoState };

    default:
      return state;
  }
}

function declineOffer(state: DemoState, outcome: 'DECLINED' | 'EXPIRED'): DemoState {
  if (state.status !== 'DRIVER_OFFERED' || !state.offer) return state;
  return {
    ...state,
    status: 'SEARCHING_DRIVER',
    offer: null,
    excludedDriverIds: [...state.excludedDriverIds, state.offer.driver.id],
    lastOfferOutcome: outcome,
    phaseRemaining: DEMO_POLICY.SEARCH_SECONDS,
  };
}

function tick(state: DemoState, seconds: number, now: number, driverOnline: boolean): DemoState {
  if (state.status === 'BOOKING_REQUESTED' || (state.status === 'SEARCHING_DRIVER' && driverOnline)) {
    const phaseRemaining = state.phaseRemaining - seconds;
    if (phaseRemaining > 0) return { ...state, phaseRemaining };
    const next: DemoEvent = state.status === 'BOOKING_REQUESTED' ? { type: 'BEGIN_SEARCH' } : { type: 'OFFER_TO_DRIVER', now };
    return transition({ ...state, phaseRemaining: 0 }, next);
  }
  if (state.status === 'DRIVER_OFFERED' && state.offer) {
    const secondsLeft = state.offer.secondsLeft - seconds;
    if (secondsLeft <= 0) return declineOffer(state, 'EXPIRED');
    return { ...state, offer: { ...state.offer, secondsLeft } };
  }
  if (state.status === 'DRIVER_ARRIVING') {
    const progress = Math.min(1, state.progress + seconds / DEMO_POLICY.APPROACH_SECONDS);
    return progress >= 1
      ? { ...state, status: 'DRIVER_ARRIVED', progress: 1 }
      : { ...state, progress };
  }
  if (state.status === 'TRIP_STARTED' && state.booking) {
    const progress = Math.min(1, state.progress + seconds / DEMO_POLICY.TRIP_SECONDS);
    return progress >= 1
      ? transition({ ...state, progress: 1 }, { type: 'COMPLETE_TRIP', now })
      : { ...state, progress };
  }
  return state;
}

/** Ends the booking as cancelled with no driver or as cancelled by the passenger. */
function endBooking(state: DemoState, now: number, reason: 'PASSENGER' | 'NO_DRIVER'): DemoState {
  if (!state.booking) return state;
  const booking: Booking = { ...state.booking, paymentStatus: 'NOT_COLLECTED' };
  return {
    ...state,
    status: 'TRIP_CANCELLED',
    booking,
    offer: null,
    progress: 0,
    cancelReason: reason,
    history: [toRecord(booking, 'CANCELLED', now), ...state.history],
  };
}

function toRecord(booking: Booking, outcome: TripRecord['outcome'], endedAt: number): TripRecord {
  return {
    id: booking.id,
    pickupLabel: booking.pickup.label,
    destinationLabel: booking.destination.label,
    distanceKm: booking.distanceKm,
    fareDemo: booking.fareDemo,
    outcome,
    endedAt,
    driverName: booking.driverName,
    paymentStatus: booking.paymentStatus,
  };
}

/** Passenger-visible statuses that map to a "searching" or "waiting" presentation. */
export function isSearching(status: BookingStatus): boolean {
  return status === 'BOOKING_REQUESTED' || status === 'SEARCHING_DRIVER';
}

export function isActiveTrip(status: BookingStatus): boolean {
  return CANCELLABLE_STATES.includes(status) || status === 'TRIP_STARTED';
}

/**
 * The next valid progression event for the demo "advance" control, or null when
 * the current state needs a passenger or driver decision instead.
 */
export function nextAdvanceEvent(state: DemoState): DemoEvent | null {
  switch (state.status) {
    case 'SEARCHING_DRIVER':
      return { type: 'OFFER_TO_DRIVER', now: Date.now() };
    case 'DRIVER_OFFERED':
      return { type: 'ACCEPT_BOOKING', driverName: state.offer?.driver.name ?? '' };
    case 'DRIVER_ACCEPTED':
      return { type: 'DRIVER_EN_ROUTE' };
    case 'DRIVER_ARRIVING':
      return { type: 'DRIVER_ARRIVED' };
    case 'DRIVER_ARRIVED':
      return { type: 'START_TRIP' };
    case 'TRIP_STARTED':
      return { type: 'COMPLETE_TRIP', now: Date.now() };
    default:
      return null;
  }
}

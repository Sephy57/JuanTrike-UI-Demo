import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  DemoEvent,
  DemoState,
  initialDemoState,
  Place,
  transition,
} from './bookingMachine';
import { DEMO_DESTINATION_COORDS, DEMO_PICKUP_COORDS, demoFareFor, haversineKm } from './geo';
import { DEMO_OUTSIDE_POINT, zoneFor } from './demoZones';
import { isAngelesCityPoint, isRouteInsideAngelesCity } from './cityBoundary';
import { routeBetween } from './router';
import type { Lang } from '../i18n/strings';

export type AppMode = 'passenger' | 'driver';
export type DemoSpeed = 1 | 2 | 4;

/** Simulated-clock tick, in real milliseconds. Demo time = tick * speed. */
const TICK_MS = 250;

/** Booking machine state. Changes on every simulated tick. */
interface DemoStateValue {
  state: DemoState;
  dispatch: (event: DemoEvent) => void;
}

/** Role, language, demo-speed and presenter controls. Almost never change. */
interface DemoControlsValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  /**
   * Switches role only while the app is still on `from`. A tap queued on the old screen
   * (or a repeated tap) therefore cannot flip the role a second time. Booking and trip
   * state are not touched.
   */
  switchMode: (from: AppMode, to: AppMode) => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** DEMO-only driver availability. Offers are only made while online. */
  driverOnline: boolean;
  setDriverOnline: (online: boolean) => void;
  /** Pauses the offer countdown and simulated movement. */
  paused: boolean;
  setPaused: (paused: boolean) => void;
  speed: DemoSpeed;
  setSpeed: (speed: DemoSpeed) => void;
  /**
   * Creates a booking from the current pickup and destination.
   * Returns false when locations are missing or either point is outside demo coverage.
   */
  confirmBooking: () => boolean;
  restoreDemoLocations: () => void;
  /** Runs the simulated driver-matching steps. Timings are fixed for presentation pacing. */
  runExampleBooking: () => void;
  /** Presentation example: a destination outside every synthetic TODA zone. */
  runOutsideCoverageExample: () => void;
}

export type DemoContextValue = DemoStateValue & DemoControlsValue;

/**
 * Booking + role state.
 *
 * Two contexts rather than one: `state` changes on every simulated tick while
 * role, language, pause and speed almost never do. Splitting them means the
 * demo panel and the welcome screen do not re-render four times a second just
 * because a vehicle marker moved. `useDemo()` merges both for call sites that
 * genuinely need everything.
 */
const DemoStateContext = createContext<DemoStateValue | null>(null);
const DemoControlsContext = createContext<DemoControlsValue | null>(null);

export const DRIVER_NAME = 'Mang Ben';

const demoPickup: Place = { label: 'Chacon St, Villa Paz', coords: DEMO_PICKUP_COORDS, source: 'demo' };
const demoDestination: Place = { label: 'J. Surla St, Pulungbulu', coords: DEMO_DESTINATION_COORDS, source: 'demo' };
const demoOutsideDestination: Place = { label: 'Outside the service area', coords: DEMO_OUTSIDE_POINT, source: 'demo' };

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, rawDispatch] = useReducer(
    (s: DemoState, e: DemoEvent) => transition(s, e),
    initialDemoState,
  );
  const [mode, setMode] = useState<AppMode>('passenger');
  const [lang, setLang] = useState<Lang>('en');
  const [driverOnline, setDriverOnline] = useState(true);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<DemoSpeed>(1);

  // Latest state for callbacks that must read it synchronously (updated after each commit).
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const dispatch = useCallback((event: DemoEvent) => rawDispatch(event), []);

  const switchMode = useCallback((from: AppMode, to: AppMode) => {
    setMode((current) => (current === from ? to : current));
  }, []);

  const confirmBooking = useCallback(() => {
    const { pickup, destination, status } = stateRef.current;
    if (status !== 'LOCATIONS_SELECTED' || !pickup || !destination) return false;
    if (!isAngelesCityPoint(pickup.coords) || !isAngelesCityPoint(destination.coords)) return false;
    if (!zoneFor(pickup.coords) || !zoneFor(destination.coords)) return false;
    const displayedRoute = routeBetween(pickup.coords, destination.coords);
    if (!isRouteInsideAngelesCity(displayedRoute.points)) return false;
    const distanceKm = haversineKm(pickup.coords, destination.coords);
    rawDispatch({
      type: 'CONFIRM_BOOKING',
      id: `DEMO-${Date.now()}`,
      now: Date.now(),
      distanceKm: Math.round(distanceKm * 100) / 100,
      fareDemo: demoFareFor(distanceKm),
      passengerName: 'Juan dela Cruz',
    });
    return true;
  }, []);

  const restoreDemoLocations = useCallback(() => {
    rawDispatch({
      type: 'RESTORE_DEMO_LOCATIONS',
      pickup: demoPickup,
      destination: demoDestination,
    });
  }, []);

  // Single simulated clock. Every timed step (request, search, offer countdown, approach,
  // trip) advances only through TICK, so pause, resume and speed apply to all of them.
  // The reducer owns the timing; no setTimeout here can drift or ignore pause.
  const timeMoves =
    state.status === 'BOOKING_REQUESTED' ||
    state.status === 'SEARCHING_DRIVER' ||
    state.status === 'DRIVER_OFFERED' ||
    state.status === 'DRIVER_ARRIVING' ||
    state.status === 'TRIP_STARTED';
  useEffect(() => {
    if (!timeMoves || paused) return undefined;
    const handle = setInterval(() => {
      rawDispatch({
        type: 'TICK',
        seconds: (TICK_MS / 1000) * speed,
        now: Date.now(),
        driverOnline,
      });
    }, TICK_MS);
    return () => clearInterval(handle);
  }, [timeMoves, paused, speed, driverOnline]);

  const runExampleBooking = useCallback(() => {
    const distanceKm = haversineKm(demoPickup.coords, demoDestination.coords);
    // Dispatched in order, so the reducer applies each step to the previous result.
    rawDispatch({ type: 'RESET' });
    rawDispatch({
      type: 'RESTORE_DEMO_LOCATIONS',
      pickup: demoPickup,
      destination: demoDestination,
    });
    rawDispatch({
      type: 'CONFIRM_BOOKING',
      id: `DEMO-${Date.now()}`,
      now: Date.now(),
      distanceKm: Math.round(distanceKm * 100) / 100,
      fareDemo: demoFareFor(distanceKm),
    });
  }, []);

  const runOutsideCoverageExample = useCallback(() => {
    rawDispatch({ type: 'RESET' });
    rawDispatch({
      type: 'RESTORE_DEMO_LOCATIONS',
      pickup: demoPickup,
      destination: demoOutsideDestination,
    });
  }, []);

  const stateValue = useMemo<DemoStateValue>(() => ({ state, dispatch }), [state, dispatch]);

  const controlsValue = useMemo<DemoControlsValue>(
    () => ({
      mode,
      setMode,
      switchMode,
      lang,
      setLang,
      driverOnline,
      setDriverOnline,
      paused,
      setPaused,
      speed,
      setSpeed,
      confirmBooking,
      restoreDemoLocations,
      runExampleBooking,
      runOutsideCoverageExample,
    }),
    [
      mode,
      setMode,
      switchMode,
      lang,
      setLang,
      driverOnline,
      setDriverOnline,
      paused,
      setPaused,
      speed,
      setSpeed,
      confirmBooking,
      restoreDemoLocations,
      runExampleBooking,
      runOutsideCoverageExample,
    ],
  );

  return (
    <DemoStateContext.Provider value={stateValue}>
      <DemoControlsContext.Provider value={controlsValue}>{children}</DemoControlsContext.Provider>
    </DemoStateContext.Provider>
  );
}

/** Booking machine state only. Re-renders on every simulated tick. */
export function useDemoState(): DemoStateValue {
  const ctx = useContext(DemoStateContext);
  if (!ctx) throw new Error('useDemoState must be used inside DemoProvider');
  return ctx;
}

/** Role, language and presenter controls. Does not re-render on ticks. */
export function useDemoControls(): DemoControlsValue {
  const ctx = useContext(DemoControlsContext);
  if (!ctx) throw new Error('useDemoControls must be used inside DemoProvider');
  return ctx;
}

/** Merged view, for call sites that genuinely need both halves. */
export function useDemo(): DemoContextValue {
  const { state, dispatch } = useDemoState();
  const controls = useDemoControls();
  return useMemo(() => ({ state, dispatch, ...controls }), [state, dispatch, controls]);
}

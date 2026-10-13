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
import type { Lang } from '../i18n/strings';

export type AppMode = 'passenger' | 'driver';
export type DemoSpeed = 1 | 2 | 4;

/** Simulated-clock tick, in real milliseconds. Demo time = tick * speed. */
const TICK_MS = 250;

interface DemoContextValue {
  state: DemoState;
  dispatch: (event: DemoEvent) => void;
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

const DemoContext = createContext<DemoContextValue | null>(null);

export const DRIVER_NAME = 'Mang Ben';

const demoPickup: Place = { label: 'DEMO Pickup A', coords: DEMO_PICKUP_COORDS, source: 'demo' };
const demoDestination: Place = { label: 'DEMO Destination B', coords: DEMO_DESTINATION_COORDS, source: 'demo' };
const demoOutsideDestination: Place = { label: 'DEMO Outside Coverage', coords: DEMO_OUTSIDE_POINT, source: 'demo' };

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
    if (!zoneFor(pickup.coords) || !zoneFor(destination.coords)) return false;
    const distanceKm = haversineKm(pickup.coords, destination.coords);
    rawDispatch({
      type: 'CONFIRM_BOOKING',
      id: `DEMO-${Date.now()}`,
      now: Date.now(),
      distanceKm: Math.round(distanceKm * 100) / 100,
      fareDemo: demoFareFor(distanceKm),
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

  const value = useMemo<DemoContextValue>(
    () => ({
      state,
      dispatch,
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
      state,
      dispatch,
      mode,
      switchMode,
      lang,
      driverOnline,
      paused,
      speed,
      confirmBooking,
      restoreDemoLocations,
      runExampleBooking,
      runOutsideCoverageExample,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used inside DemoProvider');
  return ctx;
}

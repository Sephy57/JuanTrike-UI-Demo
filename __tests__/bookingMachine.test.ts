import {
  DemoState,
  initialDemoState,
  nextAdvanceEvent,
  Place,
  transition,
} from '../src/booking/bookingMachine';
import { demoFareFor, haversineKm, DEMO_DESTINATION_COORDS, DEMO_PICKUP_COORDS } from '../src/booking/geo';

const pickup: Place = { label: 'DEMO Pickup A', coords: DEMO_PICKUP_COORDS, source: 'demo' };
const destination: Place = { label: 'DEMO Destination B', coords: DEMO_DESTINATION_COORDS, source: 'demo' };
const distanceKm = haversineKm(pickup.coords, destination.coords);
const fareDemo = demoFareFor(distanceKm);

function run(state: DemoState, events: Parameters<typeof transition>[1][]): DemoState {
  return events.reduce((s, e) => transition(s, e), state);
}

function withLocations(): DemoState {
  return run(initialDemoState, [
    { type: 'SET_PICKUP', place: pickup },
    { type: 'SET_DESTINATION', place: destination },
  ]);
}

function bookedAndAccepted(): DemoState {
  return run(withLocations(), [
    { type: 'CONFIRM_BOOKING', id: 'DEMO-1', now: 1000, distanceKm, fareDemo },
    { type: 'BEGIN_SEARCH' },
    { type: 'OFFER_TO_DRIVER' },
    { type: 'ACCEPT_BOOKING', driverName: 'Mang Ben' },
  ]);
}

describe('location selection', () => {
  it('stays IDLE until both pickup and destination are set', () => {
    const onlyPickup = transition(initialDemoState, { type: 'SET_PICKUP', place: pickup });
    expect(onlyPickup.status).toBe('IDLE');
    const both = transition(onlyPickup, { type: 'SET_DESTINATION', place: destination });
    expect(both.status).toBe('LOCATIONS_SELECTED');
  });

  it('clears locations back to IDLE', () => {
    const cleared = transition(withLocations(), { type: 'CLEAR_LOCATIONS' });
    expect(cleared).toMatchObject({ status: 'IDLE', pickup: null, destination: null });
  });

  it('cannot edit locations once a booking is requested', () => {
    const booked = run(withLocations(), [
      { type: 'CONFIRM_BOOKING', id: 'DEMO-1', now: 1, distanceKm, fareDemo },
    ]);
    expect(booked.booking?.passengerName).toBe('Juan dela Cruz');
    expect(transition(booked, { type: 'SET_PICKUP', place: destination })).toBe(booked);
  });
});

describe('booking lifecycle', () => {
  it('cannot confirm without both locations', () => {
    const s = transition(initialDemoState, { type: 'SET_PICKUP', place: pickup });
    expect(transition(s, { type: 'CONFIRM_BOOKING', id: 'x', now: 1, distanceKm, fareDemo })).toBe(s);
  });

  it('runs a full trip from request to completion and records history', () => {
    let s = bookedAndAccepted();
    expect(s.status).toBe('DRIVER_ACCEPTED');
    expect(s.booking?.driverName).toBe('Mang Ben');

    s = run(s, [
      { type: 'DRIVER_EN_ROUTE' },
      { type: 'DRIVER_ARRIVED' },
      { type: 'START_TRIP' },
      { type: 'COMPLETE_TRIP', now: 2000 },
    ]);

    expect(s.status).toBe('TRIP_COMPLETED');
    expect(s.history).toHaveLength(1);
    expect(s.history[0]).toMatchObject({ id: 'DEMO-1', outcome: 'COMPLETED', fareDemo, endedAt: 2000 });

    s = transition(s, { type: 'NEW_BOOKING' });
    expect(s).toMatchObject({ status: 'IDLE', booking: null, pickup: null, destination: null });
    expect(s.history).toHaveLength(1);
  });

  it('driver decline returns the booking to searching', () => {
    const offered = run(withLocations(), [
      { type: 'CONFIRM_BOOKING', id: 'DEMO-1', now: 1, distanceKm, fareDemo },
      { type: 'BEGIN_SEARCH' },
      { type: 'OFFER_TO_DRIVER' },
    ]);
    expect(offered.status).toBe('DRIVER_OFFERED');
    expect(transition(offered, { type: 'DECLINE_BOOKING' }).status).toBe('SEARCHING_DRIVER');
  });

  it('passenger cancellation records a cancelled trip', () => {
    const cancelled = transition(bookedAndAccepted(), { type: 'CANCEL_BOOKING', now: 3000 });
    expect(cancelled.status).toBe('TRIP_CANCELLED');
    expect(cancelled.history[0].outcome).toBe('CANCELLED');
  });

  it('cannot cancel once the trip has started', () => {
    const started = run(bookedAndAccepted(), [
      { type: 'DRIVER_EN_ROUTE' },
      { type: 'DRIVER_ARRIVED' },
      { type: 'START_TRIP' },
    ]);
    expect(transition(started, { type: 'CANCEL_BOOKING', now: 1 })).toBe(started);
  });

  it('rejects out-of-order driver events without changing state', () => {
    const accepted = bookedAndAccepted();
    expect(transition(accepted, { type: 'START_TRIP' })).toBe(accepted);
    expect(transition(accepted, { type: 'COMPLETE_TRIP', now: 1 })).toBe(accepted);
    expect(transition(accepted, { type: 'ACCEPT_BOOKING', driverName: 'Other' })).toBe(accepted);
  });

  it('RESET clears everything including history', () => {
    const done = run(bookedAndAccepted(), [{ type: 'CANCEL_BOOKING', now: 5 }]);
    expect(done.history).toHaveLength(1);
    expect(transition(done, { type: 'RESET' })).toEqual(initialDemoState);
  });
});

describe('nextAdvanceEvent', () => {
  it('walks the trip forward one valid step at a time', () => {
    let s = bookedAndAccepted();
    const seen: string[] = [];
    for (let i = 0; i < 10; i++) {
      const next = nextAdvanceEvent(s);
      if (!next) break;
      seen.push(next.type);
      s = transition(s, next);
    }
    expect(seen).toEqual(['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'START_TRIP', 'COMPLETE_TRIP']);
    expect(s.status).toBe('TRIP_COMPLETED');
  });

  it('returns null where a human decision is needed', () => {
    expect(nextAdvanceEvent(withLocations())).toBeNull();
    expect(nextAdvanceEvent(initialDemoState)).toBeNull();
  });
});

import { DemoState, initialDemoState, Place, transition } from '../src/booking/bookingMachine';
import { DEMO_DESTINATION_COORDS, DEMO_PICKUP_COORDS, haversineKm, pointAlong, simulatedRoute } from '../src/booking/geo';
import { DEMO_OUTSIDE_POINT, DEMO_POLICY, DEMO_ZONES, eligibleDrivers, zoneFor } from '../src/booking/demoZones';
import { vehiclePosition, vehicleStart } from '../src/booking/movement';

const pickup: Place = { label: 'DEMO Pickup A', coords: DEMO_PICKUP_COORDS, source: 'demo' };
const destination: Place = { label: 'DEMO Destination B', coords: DEMO_DESTINATION_COORDS, source: 'demo' };
const distanceKm = haversineKm(pickup.coords, destination.coords);

function run(state: DemoState, events: Parameters<typeof transition>[1][]): DemoState {
  return events.reduce((s, e) => transition(s, e), state);
}

function requested(dest: Place = destination, from: Place = pickup): DemoState {
  return run(initialDemoState, [
    { type: 'SET_PICKUP', place: from },
    { type: 'SET_DESTINATION', place: dest },
    { type: 'CONFIRM_BOOKING', id: 'DEMO-T', now: 1000, distanceKm, fareDemo: 40 },
    { type: 'BEGIN_SEARCH' },
  ]);
}

function offered(): DemoState {
  return run(requested(), [{ type: 'OFFER_TO_DRIVER', now: 1000 }]);
}

function accepted(): DemoState {
  return run(offered(), [{ type: 'ACCEPT_BOOKING', driverName: 'Mang Ben' }]);
}

describe('synthetic TODA geofence', () => {
  it('uses an angular reference-like TODA-A shape without covering its rectangular corner', () => {
    expect(DEMO_ZONES.find((zone) => zone.id === 'TODA-A')?.ring).toHaveLength(8);
    expect(zoneFor({ latitude: 15.14, longitude: 120.582 })).toBeNull();
  });

  it('places the demo pickup and destination inside TODA-A', () => {
    expect(zoneFor(DEMO_PICKUP_COORDS)?.id).toBe('TODA-A');
    expect(zoneFor(DEMO_DESTINATION_COORDS)?.id).toBe('TODA-A');
  });

  it('reports the outside example as outside every zone', () => {
    expect(zoneFor(DEMO_OUTSIDE_POINT)).toBeNull();
  });

  it('treats a synthetic zone edge as covered instead of a coverage gap', () => {
    expect(zoneFor({ latitude: 15.132, longitude: 120.588 })?.id).toBe('TODA-A');
    expect(zoneFor({ latitude: 15.152, longitude: 120.59 })?.id).toBe('TODA-A');
  });

  it('rejects invalid synthetic geofence coordinates', () => {
    expect(zoneFor({ latitude: Number.NaN, longitude: 120.59 })).toBeNull();
    expect(zoneFor({ latitude: 15.14, longitude: 181 })).toBeNull();
  });

  it('gives each zone a distinct colour and label', () => {
    const colours = new Set(DEMO_ZONES.map((z) => z.color));
    expect(colours.size).toBe(DEMO_ZONES.length);
    expect(DEMO_ZONES.every((z) => z.label.startsWith('SYNTHETIC'))).toBe(true);
  });

  it('returns only drivers whose TODA covers the pickup, in FIFO order', () => {
    expect(eligibleDrivers(DEMO_PICKUP_COORDS).map((d) => d.name)).toEqual(['Mang Ben', 'Mang Joel', 'Mang Ernie']);
    expect(eligibleDrivers(DEMO_OUTSIDE_POINT)).toEqual([]);
  });
});

describe('dispatch offers', () => {
  it('offers to the first eligible driver with the demo countdown', () => {
    const s = offered();
    expect(s.status).toBe('DRIVER_OFFERED');
    expect(s.offer?.driver.name).toBe('Mang Ben');
    expect(s.offer?.secondsLeft).toBe(DEMO_POLICY.OFFER_WINDOW_SECONDS);
    expect(s.offer?.attempt).toBe(1);
  });

  it('moves to the next driver after a decline', () => {
    const s = run(offered(), [{ type: 'DECLINE_BOOKING' }]);
    expect(s.status).toBe('SEARCHING_DRIVER');
    expect(s.lastOfferOutcome).toBe('DECLINED');
    const next = transition(s, { type: 'OFFER_TO_DRIVER', now: 2000 });
    expect(next.offer?.driver.name).toBe('Mang Joel');
    expect(next.offer?.attempt).toBe(2);
  });

  it('expires an offer after the countdown and escalates', () => {
    const counted = run(offered(), [{ type: 'TICK', seconds: DEMO_POLICY.OFFER_WINDOW_SECONDS - 1, now: 1 }]);
    expect(counted.status).toBe('DRIVER_OFFERED');
    const expired = transition(counted, { type: 'TICK', seconds: 1, now: 2 });
    expect(expired.status).toBe('SEARCHING_DRIVER');
    expect(expired.lastOfferOutcome).toBe('EXPIRED');
    expect(transition(expired, { type: 'OFFER_TO_DRIVER', now: 3 }).offer?.driver.name).toBe('Mang Joel');
  });

  it('offers the third eligible driver on the third attempt', () => {
    const s = run(offered(), [
      { type: 'DECLINE_BOOKING' },
      { type: 'OFFER_TO_DRIVER', now: 2000 },
      { type: 'DECLINE_BOOKING' },
      { type: 'OFFER_TO_DRIVER', now: 3000 },
    ]);
    expect(s.status).toBe('DRIVER_OFFERED');
    expect(s.offer?.driver.name).toBe('Mang Ernie');
    expect(s.offer?.attempt).toBe(3);
  });

  it('cancels with NO_DRIVER once every eligible driver has declined', () => {
    const s = run(offered(), [
      { type: 'DECLINE_BOOKING' },
      { type: 'OFFER_TO_DRIVER', now: 2000 },
      { type: 'DECLINE_BOOKING' },
      { type: 'OFFER_TO_DRIVER', now: 3000 },
      { type: 'DECLINE_BOOKING' },
      { type: 'OFFER_TO_DRIVER', now: 4000 },
    ]);
    expect(s.status).toBe('TRIP_CANCELLED');
    expect(s.cancelReason).toBe('NO_DRIVER');
    expect(s.history[0]).toMatchObject({ outcome: 'CANCELLED', paymentStatus: 'NOT_COLLECTED' });
  });

  it('cancels with NO_DRIVER when the pickup has no synthetic driver', () => {
    const zoneC: Place = { label: 'Zone C pickup', coords: { latitude: 15.126, longitude: 120.59 }, source: 'demo' };
    const s = run(requested(destination, zoneC), [{ type: 'OFFER_TO_DRIVER', now: 1 }]);
    expect(s.status).toBe('TRIP_CANCELLED');
    expect(s.cancelReason).toBe('NO_DRIVER');
  });

  it('never assigns the same booking to a second driver', () => {
    const a = accepted();
    expect(a.driver?.name).toBe('Mang Ben');
    expect(transition(a, { type: 'ACCEPT_BOOKING', driverName: 'Mang Joel' })).toBe(a);
    expect(transition(a, { type: 'OFFER_TO_DRIVER', now: 5 })).toBe(a);
  });

  it('tells the passenger when they cancel themselves', () => {
    const s = transition(offered(), { type: 'CANCEL_BOOKING', now: 9 });
    expect(s.status).toBe('TRIP_CANCELLED');
    expect(s.cancelReason).toBe('PASSENGER');
  });
});

describe('simulated movement and payment', () => {
  it('moves the driver to pickup and then marks arrival', () => {
    const arriving = run(accepted(), [{ type: 'DRIVER_EN_ROUTE' }]);
    const half = transition(arriving, { type: 'TICK', seconds: DEMO_POLICY.APPROACH_SECONDS / 2, now: 1 });
    expect(half.status).toBe('DRIVER_ARRIVING');
    expect(half.progress).toBeCloseTo(0.5);
    const arrived = transition(half, { type: 'TICK', seconds: DEMO_POLICY.APPROACH_SECONDS, now: 2 });
    expect(arrived.status).toBe('DRIVER_ARRIVED');
  });

  it('completes the trip automatically and records cash as collected (DEMO)', () => {
    const trip = run(accepted(), [
      { type: 'DRIVER_EN_ROUTE' },
      { type: 'DRIVER_ARRIVED' },
      { type: 'START_TRIP' },
    ]);
    const done = transition(trip, { type: 'TICK', seconds: DEMO_POLICY.TRIP_SECONDS, now: 4000 });
    expect(done.status).toBe('TRIP_COMPLETED');
    expect(done.history[0]).toMatchObject({ outcome: 'COMPLETED', paymentStatus: 'COLLECTED_DEMO', driverName: 'Mang Ben' });
  });

  it('ignores ticks when no time-based step is running', () => {
    const s = run(initialDemoState, [
      { type: 'SET_PICKUP', place: pickup },
      { type: 'SET_DESTINATION', place: destination },
    ]);
    expect(transition(s, { type: 'TICK', seconds: 5, now: 1 })).toBe(s);
  });

  it('runs the request and search phases on the clock and holds the search while offline', () => {
    const start = run(initialDemoState, [
      { type: 'SET_PICKUP', place: pickup },
      { type: 'SET_DESTINATION', place: destination },
      { type: 'CONFIRM_BOOKING', id: 'DEMO-C', now: 1, distanceKm, fareDemo: 40 },
    ]);
    expect(start.phaseRemaining).toBe(DEMO_POLICY.REQUEST_SECONDS);
    const searching = transition(start, { type: 'TICK', seconds: 1, now: 2, driverOnline: true });
    expect(searching.status).toBe('SEARCHING_DRIVER');

    const offline = run(searching, [{ type: 'TICK', seconds: 60, now: 3, driverOnline: false }]);
    expect(offline.status).toBe('SEARCHING_DRIVER');
    expect(offline.offer).toBeNull();

    const offer = transition(searching, { type: 'TICK', seconds: DEMO_POLICY.SEARCH_SECONDS, now: 4, driverOnline: true });
    expect(offer.status).toBe('DRIVER_OFFERED');
  });
});

describe('simulated route helpers', () => {
  it('starts and ends the simulated route at the given points', () => {
    const route = simulatedRoute(pickup.coords, destination.coords);
    expect(route[0]).toEqual(pickup.coords);
    expect(route[route.length - 1]).toEqual(destination.coords);
    expect(route).toHaveLength(3);
  });

  it('interpolates along a polyline and clamps at the ends', () => {
    const line = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 2 },
    ];
    expect(pointAlong(line, 0)).toEqual(line[0]);
    expect(pointAlong(line, 1)).toEqual(line[1]);
    expect(pointAlong(line, 0.5).longitude).toBeCloseTo(1);
    expect(pointAlong(line, 2)).toEqual(line[1]);
  });

  it('places the vehicle at the driver start before the approach begins', () => {
    const s = accepted();
    expect(vehiclePosition(s)).toEqual(vehicleStart(s.driver!, pickup.coords));
  });
});

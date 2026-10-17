import { DemoState, initialDemoState, Place, transition } from '../src/booking/bookingMachine';
import { buildRouteLayers, LAYER_PREVIEW, LAYER_REMAINING, LAYER_TRAVELED } from '../src/booking/routeLayers';
import { DEMO_DESTINATION_COORDS, DEMO_PICKUP_COORDS, haversineKm } from '../src/booking/geo';
import { activeRouteResult, vehicleHeading, vehiclePosition } from '../src/booking/movement';
import { routeColors } from '../src/theme/tokens';

const pickup: Place = { label: 'DEMO Pickup A', coords: DEMO_PICKUP_COORDS, source: 'demo' };
const destination: Place = { label: 'DEMO Destination B', coords: DEMO_DESTINATION_COORDS, source: 'demo' };
const distanceKm = haversineKm(pickup.coords, destination.coords);

function run(state: DemoState, events: Parameters<typeof transition>[1][]): DemoState {
  return events.reduce((s, e) => transition(s, e), state);
}

function requested(): DemoState {
  return run(initialDemoState, [
    { type: 'SET_PICKUP', place: pickup },
    { type: 'SET_DESTINATION', place: destination },
    { type: 'CONFIRM_BOOKING', id: 'DEMO-T', now: 1000, distanceKm, fareDemo: 40 },
    { type: 'BEGIN_SEARCH' },
  ]);
}

function accepted(): DemoState {
  return run(requested(), [
    { type: 'OFFER_TO_DRIVER', now: 1000 },
    { type: 'ACCEPT_BOOKING', driverName: 'Mang Ben' },
  ]);
}

function arriving(): DemoState {
  return run(accepted(), [
    { type: 'DRIVER_EN_ROUTE' },
    { type: 'TICK', seconds: 1, now: 1 },
  ]);
}

function onTrip(): DemoState {
  return run(arriving(), [
    { type: 'DRIVER_ARRIVED' },
    { type: 'START_TRIP' },
    { type: 'TICK', seconds: 1, now: 1 },
  ]);
}

describe('buildRouteLayers', () => {
  it('draws one dashed preview line while locations are only being reviewed', () => {
    const layers = buildRouteLayers(
      run(initialDemoState, [
        { type: 'SET_PICKUP', place: pickup },
        { type: 'SET_DESTINATION', place: destination },
      ]),
    );
    expect(layers).toHaveLength(1);
    expect(layers[0].id).toBe(LAYER_PREVIEW);
    expect(layers[0].dashed).toBe(true);
    expect(layers[0].color).toBe(routeColors.preview);
    expect(layers[0].points).toHaveLength(activeRouteResult(
      run(initialDemoState, [
        { type: 'SET_PICKUP', place: pickup },
        { type: 'SET_DESTINATION', place: destination },
      ]),
    )!.points.length);
  });

  it('keeps the preview line through searching and the offer', () => {
    for (const state of [requested(), run(requested(), [{ type: 'OFFER_TO_DRIVER', now: 1000 }])]) {
      const layers = buildRouteLayers(state);
      expect(layers.map((l) => l.id)).toEqual([LAYER_PREVIEW]);
    }
  });

  it('switches to the approach route once a driver is assigned, with no split yet', () => {
    const layers = buildRouteLayers(accepted());
    expect(layers).toHaveLength(1);
    expect(layers[0].id).toBe(LAYER_REMAINING);
    expect(layers[0].color).toBe(routeColors.approach);
    expect(layers[0].dashed).toBeFalsy();
  });

  it('splits the approach into travelled and remaining while the vehicle moves', () => {
    const state = arriving();
    const layers = buildRouteLayers(state);
    expect(layers.map((l) => l.id)).toEqual([LAYER_TRAVELED, LAYER_REMAINING]);
    expect(layers[0].color).toBe(routeColors.traveled);
    expect(layers[1].color).toBe(routeColors.approach);
    // Both halves share one split point, so the drawn line has no gap.
    expect(layers[0].points[layers[0].points.length - 1]).toEqual(layers[1].points[0]);
    expect(layers[0].points.length).toBeGreaterThanOrEqual(2);
    expect(layers[1].points.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps the two halves joined as progress advances', () => {
    for (const seconds of [1, 5, 10]) {
      const state = run(accepted(), [
        { type: 'DRIVER_EN_ROUTE' },
        { type: 'TICK', seconds, now: 1000 + seconds },
      ]);
      const layers = buildRouteLayers(state);
      expect(layers[0].points[layers[0].points.length - 1]).toEqual(layers[1].points[0]);
    }
  });

  it('uses the trip colour once the passenger is on board', () => {
    const layers = buildRouteLayers(onTrip());
    expect(layers.map((l) => l.id)).toEqual([LAYER_TRAVELED, LAYER_REMAINING]);
    expect(layers[1].color).toBe(routeColors.trip);
  });

  it('drops the travelled half at the very start of a leg', () => {
    const start = run(accepted(), [{ type: 'DRIVER_EN_ROUTE' }]);
    expect(buildRouteLayers(start).map((l) => l.id)).toEqual([LAYER_REMAINING]);
  });

  it('draws nothing when there are no locations', () => {
    expect(buildRouteLayers(initialDemoState)).toEqual([]);
  });
});

describe('vehicle heading', () => {
  it('is null before the driver starts moving', () => {
    expect(vehicleHeading(accepted())).toBeNull();
    expect(vehiclePosition(accepted())).not.toBeNull();
  });

  it('points along the approach route while the driver is on the way', () => {
    const state = arriving();
    const heading = vehicleHeading(state);
    expect(heading).not.toBeNull();
    expect(heading!).toBeGreaterThanOrEqual(0);
    expect(heading!).toBeLessThanOrEqual(360);
  });

  it('points along the trip route once the trip has started', () => {
    const heading = vehicleHeading(onTrip());
    expect(heading).not.toBeNull();
  });
});

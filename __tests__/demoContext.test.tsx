import React, { useEffect } from 'react';
import { act, render } from '@testing-library/react-native';
import { DemoProvider, useDemo } from '../src/booking/DemoContext';
import { DEMO_POLICY } from '../src/booking/demoZones';

type Api = ReturnType<typeof useDemo>;

let api: Api;

function Probe() {
  const demo = useDemo();
  // Publish the latest context value after each commit, not during render.
  useEffect(() => {
    api = demo;
  });
  return null;
}

async function mount() {
  await act(async () => {
    render(
      <DemoProvider>
        <Probe />
      </DemoProvider>,
    );
  });
}

/** Ticks are 250 ms real time. Stepping at the same size lets React flush effects between ticks. */
const STEP_MS = 250;

/** Advance fake time by exactly `ms`, in tick-sized steps. */
async function advance(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += STEP_MS) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(STEP_MS, ms - elapsed));
    });
  }
}

/** Advance in ticks until `done` is true, failing if that takes longer than `maxMs`. */
async function advanceUntil(done: () => boolean, maxMs: number) {
  for (let elapsed = 0; elapsed < maxMs; elapsed += STEP_MS) {
    if (done()) return;
    await advance(STEP_MS);
  }
  if (!done()) throw new Error(`condition not reached within ${maxMs} ms; status=${api.state.status}`);
}

const offered = () => api.state.status === 'DRIVER_OFFERED';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('DemoProvider simulated clock (deterministic, fake timers)', () => {
  it('moves from request to search to offer on the clock, then counts down the offer window', async () => {
    await mount();
    await act(async () => api.runExampleBooking());
    expect(api.state.status).toBe('BOOKING_REQUESTED');

    await advanceUntil(() => api.state.status === 'SEARCHING_DRIVER', 2000);
    await advanceUntil(offered, 5000);
    expect(api.state.offer?.driver.name).toBe('Mang Ben');
    expect(api.state.offer?.secondsLeft).toBe(DEMO_POLICY.OFFER_WINDOW_SECONDS);

    await advance(1000);
    expect(api.state.offer?.secondsLeft).toBe(DEMO_POLICY.OFFER_WINDOW_SECONDS - 1);
  });

  it('stops every timed step while paused and resumes from the same point', async () => {
    await mount();
    await act(async () => api.runExampleBooking());
    await advanceUntil(offered, 5000);
    await advance(3000);
    const before = api.state.offer?.secondsLeft;

    await act(async () => api.setPaused(true));
    await advance(60_000);
    expect(api.state.status).toBe('DRIVER_OFFERED');
    expect(api.state.offer?.secondsLeft).toBe(before);

    await act(async () => api.setPaused(false));
    await advance(2000);
    expect(api.state.offer?.secondsLeft).toBe((before ?? 0) - 2);
  });

  it('holds a booking confirmed while paused until the simulation is resumed', async () => {
    await mount();
    await act(async () => api.setPaused(true));
    await act(async () => api.runExampleBooking());
    await advance(60_000);
    expect(api.state.status).toBe('BOOKING_REQUESTED');
    expect(api.state.offer).toBeNull();

    await act(async () => api.setPaused(false));
    await advanceUntil(offered, 5000);
    expect(api.state.status).toBe('DRIVER_OFFERED');
  });

  it('does not search for a driver while paused during the search phase', async () => {
    await mount();
    await act(async () => api.runExampleBooking());
    await act(async () => api.setPaused(true));
    await advance(30_000);
    expect(api.state.status).toBe('BOOKING_REQUESTED');
    await act(async () => api.setPaused(false));
    await advanceUntil(offered, 5000);
    expect(api.state.status).toBe('DRIVER_OFFERED');
  });

  it('accepts an offer made while paused and assigns the offered driver', async () => {
    await mount();
    await act(async () => api.runExampleBooking());
    await advanceUntil(offered, 5000);
    await act(async () => api.setPaused(true));
    await advance(30_000);
    expect(api.state.status).toBe('DRIVER_OFFERED');

    await act(async () => api.dispatch({ type: 'ACCEPT_BOOKING', driverName: 'Mang Ben' }));
    expect(api.state.status).toBe('DRIVER_ACCEPTED');
    expect(api.state.driver?.name).toBe('Mang Ben');
    expect(api.state.booking?.driverName).toBe('Mang Ben');
    expect(api.state.offer).toBeNull();
  });

  it('declines an offer and moves to the next eligible driver after the search phase', async () => {
    await mount();
    await act(async () => api.runExampleBooking());
    await advanceUntil(offered, 5000);
    await act(async () => api.dispatch({ type: 'DECLINE_BOOKING' }));
    expect(api.state.status).toBe('SEARCHING_DRIVER');
    expect(api.state.lastOfferOutcome).toBe('DECLINED');

    await advanceUntil(offered, 5000);
    expect(api.state.offer?.driver.name).toBe('Mang Joel');
    expect(api.state.offer?.attempt).toBe(2);
  });

  it('expires an offer after the window and escalates without any user input', async () => {
    await mount();
    await act(async () => api.runExampleBooking());
    await advanceUntil(offered, 5000);
    await advance(DEMO_POLICY.OFFER_WINDOW_SECONDS * 1000);
    expect(api.state.lastOfferOutcome).toBe('EXPIRED');
    expect(api.state.status).toBe('SEARCHING_DRIVER');

    await advanceUntil(offered, 5000);
    expect(api.state.offer?.driver.name).toBe('Mang Joel');
  });

  it('ends with NO_DRIVER after three unsuccessful attempts and does not keep ticking', async () => {
    await mount();
    await act(async () => api.runExampleBooking());
    // Attempt 1 (Mang Ben), attempt 2 (Mang Joel) and attempt 3 (Mang Ernie) all expire.
    await advanceUntil(offered, 5000);
    await advance(DEMO_POLICY.OFFER_WINDOW_SECONDS * 1000);
    await advanceUntil(offered, 5000);
    await advance(DEMO_POLICY.OFFER_WINDOW_SECONDS * 1000);
    await advanceUntil(offered, 5000);
    expect(api.state.offer?.driver.name).toBe('Mang Ernie');
    await advance(DEMO_POLICY.OFFER_WINDOW_SECONDS * 1000);
    // After the third expiry the attempt cap is reached and the booking ends with no driver.
    await advanceUntil(() => api.state.status === 'TRIP_CANCELLED', DEMO_POLICY.SEARCH_SECONDS * 1000 + 1000);
    expect(api.state.status).toBe('TRIP_CANCELLED');
    expect(api.state.cancelReason).toBe('NO_DRIVER');
    expect(api.state.history[0]).toMatchObject({ outcome: 'CANCELLED', paymentStatus: 'NOT_COLLECTED' });

    await advance(60_000);
    expect(api.state.status).toBe('TRIP_CANCELLED');
  });

  it('completes an accepted booking with cash recorded as DEMO collected', async () => {
    await mount();
    await act(async () => api.runExampleBooking());
    await advanceUntil(offered, 5000);
    await act(async () => api.dispatch({ type: 'ACCEPT_BOOKING', driverName: 'Mang Ben' }));
    await act(async () => api.dispatch({ type: 'DRIVER_EN_ROUTE' }));

    await advanceUntil(() => api.state.status === 'DRIVER_ARRIVED', (DEMO_POLICY.APPROACH_SECONDS + 1) * 1000);
    await act(async () => api.dispatch({ type: 'START_TRIP' }));
    await advanceUntil(() => api.state.status === 'TRIP_COMPLETED', (DEMO_POLICY.TRIP_SECONDS + 1) * 1000);
    expect(api.state.history[0]).toMatchObject({ outcome: 'COMPLETED', paymentStatus: 'COLLECTED_DEMO', driverName: 'Mang Ben' });
  });

  it('moves the vehicle only while the approach runs, and never after cancellation', async () => {
    await mount();
    await act(async () => api.runExampleBooking());
    await advanceUntil(offered, 5000);
    await act(async () => api.dispatch({ type: 'ACCEPT_BOOKING', driverName: 'Mang Ben' }));
    await act(async () => api.dispatch({ type: 'DRIVER_EN_ROUTE' }));
    await advance(5000);
    expect(api.state.progress).toBeGreaterThan(0);

    await act(async () => api.dispatch({ type: 'CANCEL_BOOKING', now: 1 }));
    await advance(60_000);
    expect(api.state.status).toBe('TRIP_CANCELLED');
    expect(api.state.progress).toBe(0);
  });

  it('applies the speed setting to the simulated clock', async () => {
    await mount();
    await act(async () => api.runExampleBooking());
    await advanceUntil(offered, 5000);
    const before = api.state.offer?.secondsLeft ?? 0;
    await act(async () => api.setSpeed(4));
    await advance(1000); // 1 real second at 4x = 4 demo seconds
    expect(api.state.offer?.secondsLeft).toBe(before - 4);
  });

  it('refuses to confirm a booking outside synthetic coverage', async () => {
    await mount();
    await act(async () => api.runOutsideCoverageExample());
    expect(api.state.status).toBe('LOCATIONS_SELECTED');
    let ok = true;
    await act(async () => {
      ok = api.confirmBooking();
    });
    expect(ok).toBe(false);
    expect(api.state.status).toBe('LOCATIONS_SELECTED');
  });

  it('reset during an active offer returns to the initial state and stops the clock', async () => {
    await mount();
    await act(async () => api.runExampleBooking());
    await advanceUntil(offered, 5000);
    await act(async () => api.dispatch({ type: 'RESET' }));
    expect(api.state.status).toBe('IDLE');
    expect(api.state.offer).toBeNull();
    await advance(60_000);
    expect(api.state.status).toBe('IDLE');
  });

  it('reset after a completed trip clears the active booking and keeps history', async () => {
    await mount();
    await act(async () => api.runExampleBooking());
    await advanceUntil(offered, 5000);
    await act(async () => api.dispatch({ type: 'ACCEPT_BOOKING', driverName: 'Mang Ben' }));
    await act(async () => api.dispatch({ type: 'DRIVER_EN_ROUTE' }));
    await advanceUntil(() => api.state.status === 'DRIVER_ARRIVED', (DEMO_POLICY.APPROACH_SECONDS + 1) * 1000);
    await act(async () => api.dispatch({ type: 'START_TRIP' }));
    await advanceUntil(() => api.state.status === 'TRIP_COMPLETED', (DEMO_POLICY.TRIP_SECONDS + 1) * 1000);

    await act(async () => api.dispatch({ type: 'NEW_BOOKING' }));
    expect(api.state.status).toBe('IDLE');
    expect(api.state.booking).toBeNull();
    expect(api.state.history).toHaveLength(1);
  });
});

describe('role switching (mode-switch reliability)', () => {
  it('switches role with a single explicit tap and leaves booking state untouched', async () => {
    await mount();
    await act(async () => api.runExampleBooking());
    await advanceUntil(offered, 5000);
    const before = api.state;
    await act(async () => api.switchMode('passenger', 'driver'));
    expect(api.mode).toBe('driver');
    expect(api.state).toBe(before);
  });

  it('ignores repeated taps for the same switch (no double flip)', async () => {
    await mount();
    await act(async () => {
      api.switchMode('passenger', 'driver');
      api.switchMode('passenger', 'driver');
      api.switchMode('passenger', 'driver');
    });
    expect(api.mode).toBe('driver');
  });

  it('ignores a delayed tap from the old screen after the role already changed', async () => {
    await mount();
    await act(async () => api.switchMode('passenger', 'driver'));
    // The queued tap was registered on the passenger header, so it must not flip back.
    await act(async () => api.switchMode('passenger', 'driver'));
    expect(api.mode).toBe('driver');
    await act(async () => api.switchMode('driver', 'passenger'));
    expect(api.mode).toBe('passenger');
    await act(async () => api.switchMode('driver', 'passenger'));
    expect(api.mode).toBe('passenger');
  });

  it('rapid alternating switches always end on the last valid target', async () => {
    await mount();
    for (let i = 0; i < 10; i += 1) {
      await act(async () => api.switchMode(api.mode, api.mode === 'passenger' ? 'driver' : 'passenger'));
    }
    expect(api.mode).toBe('passenger');
  });

  it('keeps an active trip and its history intact across role switches', async () => {
    await mount();
    await act(async () => api.runExampleBooking());
    await advanceUntil(offered, 5000);
    await act(async () => api.dispatch({ type: 'ACCEPT_BOOKING', driverName: 'Mang Ben' }));
    await act(async () => api.dispatch({ type: 'DRIVER_EN_ROUTE' }));
    await act(async () => api.switchMode('passenger', 'driver'));
    await advanceUntil(() => api.state.status === 'DRIVER_ARRIVED', (DEMO_POLICY.APPROACH_SECONDS + 1) * 1000);
    await act(async () => api.dispatch({ type: 'START_TRIP' }));
    await act(async () => api.switchMode('driver', 'passenger'));
    await advanceUntil(() => api.state.status === 'TRIP_COMPLETED', (DEMO_POLICY.TRIP_SECONDS + 1) * 1000);
    expect(api.mode).toBe('passenger');
    expect(api.state.history).toHaveLength(1);
    expect(api.state.history[0].outcome).toBe('COMPLETED');
  });
});

describe('simulation clock regression', () => {
  it('a second booking after cancellation starts from a clean state with one clock', async () => {
    await mount();
    await act(async () => api.runExampleBooking());
    await advanceUntil(offered, 5000);
    await act(async () => api.dispatch({ type: 'CANCEL_BOOKING', now: Date.now() }));
    expect(api.state.status).toBe('TRIP_CANCELLED');

    await act(async () => api.runExampleBooking());
    expect(api.state.status).toBe('BOOKING_REQUESTED');
    await advanceUntil(offered, 5000);
    expect(api.state.status).toBe('DRIVER_OFFERED');
    expect(api.state.attempts).toBe(1);
  });

  it('cancellation leaves no stale offer and the clock stops', async () => {
    await mount();
    await act(async () => api.runExampleBooking());
    await advanceUntil(offered, 5000);
    await act(async () => api.dispatch({ type: 'CANCEL_BOOKING', now: Date.now() }));
    expect(api.state.offer).toBeNull();
    await advance(60_000);
    expect(api.state.status).toBe('TRIP_CANCELLED');
    expect(api.state.offer).toBeNull();
  });

  it('a large timing gap does not corrupt the offer state or exceed the attempt cap', async () => {
    await mount();
    await act(async () => api.runExampleBooking());
    await advanceUntil(offered, 5000);
    await act(async () => api.dispatch({ type: 'TICK', seconds: 3600, now: Date.now(), driverOnline: true }));
    expect(api.state.attempts).toBeLessThanOrEqual(DEMO_POLICY.MAX_OFFER_ATTEMPTS);
    expect(api.state.status === 'TRIP_CANCELLED' || api.state.status === 'SEARCHING_DRIVER' || api.state.status === 'DRIVER_OFFERED').toBe(true);
    expect(api.state.offer === null || api.state.offer.secondsLeft > 0).toBe(true);
  });
});

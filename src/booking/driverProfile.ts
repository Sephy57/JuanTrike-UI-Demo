import type { DemoState } from './bookingMachine';
import { DEMO_DRIVERS } from './demoZones';
import type { DemoDriver } from './demoZones';

/** The Driver screen follows the assigned driver, then the current offer, then FIFO idle. */
export function driverProfileFor(state: Pick<DemoState, 'driver' | 'offer'>): DemoDriver {
  return state.driver ?? state.offer?.driver ?? DEMO_DRIVERS[0];
}

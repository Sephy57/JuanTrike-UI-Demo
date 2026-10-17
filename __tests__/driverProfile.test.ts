import { DEMO_DRIVERS } from '../src/booking/demoZones';
import { driverProfileFor } from '../src/booking/driverProfile';

describe('driverProfileFor', () => {
  it('shows the synthetic driver who currently holds an incoming offer', () => {
    const offered = DEMO_DRIVERS[2];

    expect(
      driverProfileFor({
        driver: null,
        offer: { driver: offered, secondsLeft: 12, attempt: 1 },
      }),
    ).toBe(offered);
  });

  it('keeps the accepted synthetic driver as the active profile', () => {
    const assigned = DEMO_DRIVERS[3];

    expect(driverProfileFor({ driver: assigned, offer: null })).toBe(assigned);
  });

  it('uses the first FIFO driver while no offer or assignment exists', () => {
    expect(driverProfileFor({ driver: null, offer: null })).toBe(DEMO_DRIVERS[0]);
  });
});

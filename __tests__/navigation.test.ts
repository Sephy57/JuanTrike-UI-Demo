import { routeForMode } from '../src/navigation/routes';

describe('routeForMode', () => {
  it('selects the passenger route for passenger mode', () => {
    expect(routeForMode('passenger')).toBe('/passenger');
  });

  it('selects the driver route for driver mode', () => {
    expect(routeForMode('driver')).toBe('/driver');
  });
});

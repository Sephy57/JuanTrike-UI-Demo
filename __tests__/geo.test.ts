import { demoFareFor, formatCoords, haversineKm, ANGELES_CITY_CENTER } from '../src/booking/geo';

describe('haversineKm', () => {
  it('is zero for identical points', () => {
    expect(haversineKm(ANGELES_CITY_CENTER, ANGELES_CITY_CENTER)).toBe(0);
  });

  it('is approximately 1.11 km per 0.01 degree of latitude', () => {
    const a = { latitude: 15.0, longitude: 120.0 };
    const b = { latitude: 15.01, longitude: 120.0 };
    expect(haversineKm(a, b)).toBeCloseTo(1.112, 2);
  });
});

describe('demoFareFor', () => {
  it('is a synthetic base fare plus a per-km rate, rounded to whole pesos', () => {
    expect(demoFareFor(0)).toBe(20);
    expect(demoFareFor(2)).toBe(47);
  });
});

describe('formatCoords', () => {
  it('formats to five decimals', () => {
    expect(formatCoords({ latitude: 15.1, longitude: 120.59601 })).toBe('15.10000, 120.59601');
  });
});

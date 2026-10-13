import { buildGpsFix, LAST_KNOWN_MAX_AGE_MS } from '../src/location/gpsFix';

const position = {
  coords: { latitude: 14.5995, longitude: 120.9842, accuracy: 5 },
  timestamp: 1_700_000_000_000,
};

describe('buildGpsFix', () => {
  it('maps coordinates in latitude/longitude order without reordering', () => {
    const fix = buildGpsFix(position, 'current', false);
    expect(fix.coords).toEqual({ latitude: 14.5995, longitude: 120.9842 });
  });

  it('marks emulator fixes as simulated', () => {
    expect(buildGpsFix(position, 'current', false).simulated).toBe(true);
  });

  it('marks physical-device fixes as not simulated', () => {
    expect(buildGpsFix(position, 'current', true).simulated).toBe(false);
  });

  it('keeps the live-versus-last-known source on the fix', () => {
    expect(buildGpsFix(position, 'current', true).source).toBe('current');
    expect(buildGpsFix(position, 'last-known', true).source).toBe('last-known');
  });

  it('reports null accuracy rather than inventing a value', () => {
    const fix = buildGpsFix(
      { coords: { latitude: 1, longitude: 2 }, timestamp: 3 },
      'current',
      true,
    );
    expect(fix.accuracyM).toBeNull();
  });

  it('carries the platform timestamp through unchanged', () => {
    expect(buildGpsFix(position, 'current', true).takenAt).toBe(position.timestamp);
  });
});

describe('LAST_KNOWN_MAX_AGE_MS', () => {
  it('bounds cached fixes to 24 hours', () => {
    expect(LAST_KNOWN_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000);
  });
});

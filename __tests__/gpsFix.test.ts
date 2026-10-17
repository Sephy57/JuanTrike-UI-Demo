import {
  buildGpsFix,
  CURRENT_FIX_MAX_AGE_MS,
  FUTURE_FIX_TOLERANCE_MS,
  LAST_KNOWN_MAX_AGE_MS,
  validateGpsFix,
} from '../src/location/gpsFix';

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
  it('bounds cached fixes to five minutes', () => {
    expect(LAST_KNOWN_MAX_AGE_MS).toBe(5 * 60 * 1000);
  });
});

describe('validateGpsFix', () => {
  const now = 1_700_000_000_000;

  it('accepts an in-range recent position and preserves its accuracy', () => {
    expect(validateGpsFix(position, 'current', true, now)).toEqual({
      ok: true,
      fix: {
        coords: { latitude: 14.5995, longitude: 120.9842 },
        accuracyM: 5,
        simulated: false,
        source: 'current',
        takenAt: position.timestamp,
      },
    });
  });

  it.each([
    { latitude: Number.NaN, longitude: 120 },
    { latitude: 91, longitude: 120 },
    { latitude: 14, longitude: -181 },
    { latitude: 14, longitude: Number.POSITIVE_INFINITY },
  ])('rejects invalid coordinate pair $latitude, $longitude', (coords) => {
    expect(validateGpsFix({ coords, timestamp: now }, 'current', true, now)).toEqual({
      ok: false,
      reason: 'invalid-coordinates',
    });
  });

  it('rejects a stale current fix', () => {
    expect(
      validateGpsFix(
        { ...position, timestamp: now - CURRENT_FIX_MAX_AGE_MS - 1 },
        'current',
        true,
        now,
      ),
    ).toEqual({ ok: false, reason: 'stale' });
  });

  it('rejects a cached fix older than the last-known limit', () => {
    expect(
      validateGpsFix(
        { ...position, timestamp: now - LAST_KNOWN_MAX_AGE_MS - 1 },
        'last-known',
        true,
        now,
      ),
    ).toEqual({ ok: false, reason: 'stale' });
  });

  it('rejects a timestamp too far in the future', () => {
    expect(
      validateGpsFix(
        { ...position, timestamp: now + FUTURE_FIX_TOLERANCE_MS + 1 },
        'current',
        true,
        now,
      ),
    ).toEqual({ ok: false, reason: 'future-timestamp' });
  });

  it('rejects missing, non-finite, or non-positive timestamps', () => {
    for (const timestamp of [Number.NaN, Number.POSITIVE_INFINITY, 0, -1]) {
      expect(
        validateGpsFix({ ...position, timestamp }, 'current', true, now),
      ).toEqual({ ok: false, reason: 'invalid-timestamp' });
    }
  });

  it('keeps an unknown accuracy as null instead of inventing one', () => {
    const result = validateGpsFix(
      { coords: { latitude: 14, longitude: 120, accuracy: -1 }, timestamp: now },
      'current',
      true,
      now,
    );
    expect(result.ok && result.fix.accuracyM).toBeNull();
  });
});

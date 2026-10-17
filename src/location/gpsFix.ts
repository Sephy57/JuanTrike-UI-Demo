import type { LatLng } from '../booking/bookingMachine';

/** Where a fix came from: a live read, or the device's cached last-known position. */
export type FixSource = 'current' | 'last-known';

export interface GpsFix {
  coords: LatLng;
  accuracyM: number | null;
  /** True when the fix came from an Android emulator, not a physical GPS receiver. */
  simulated: boolean;
  source: FixSource;
  takenAt: number;
}

export interface PositionLike {
  coords: { latitude: number; longitude: number; accuracy?: number | null };
  timestamp: number;
}

/** A one-shot current-position result must be recent enough to use as a pickup. */
export const CURRENT_FIX_MAX_AGE_MS = 2 * 60 * 1000;

/** Cached fixes older than this are rejected rather than shown as a current location. */
export const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;

/** Small tolerance for clocks that differ by a few seconds. */
export const FUTURE_FIX_TOLERANCE_MS = 5 * 1000;

export type GpsFixRejection =
  | 'invalid-coordinates'
  | 'invalid-timestamp'
  | 'future-timestamp'
  | 'stale';

export type GpsFixValidation =
  | { ok: true; fix: GpsFix }
  | { ok: false; reason: GpsFixRejection };

/** Maps a platform position into a typed fix. Pure, so the source labeling is testable. */
export function buildGpsFix(
  position: PositionLike,
  source: FixSource,
  isDevice: boolean,
): GpsFix {
  return {
    coords: { latitude: position.coords.latitude, longitude: position.coords.longitude },
    accuracyM:
      typeof position.coords.accuracy === 'number' &&
      Number.isFinite(position.coords.accuracy) &&
      position.coords.accuracy >= 0
        ? position.coords.accuracy
        : null,
    simulated: !isDevice,
    source,
    takenAt: position.timestamp,
  };
}

/** Validates platform coordinates and age before they can be used as a pickup. */
export function validateGpsFix(
  position: PositionLike,
  source: FixSource,
  isDevice: boolean,
  now = Date.now(),
): GpsFixValidation {
  const { latitude, longitude } = position.coords;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return { ok: false, reason: 'invalid-coordinates' };
  }

  if (!Number.isFinite(position.timestamp) || position.timestamp <= 0) {
    return { ok: false, reason: 'invalid-timestamp' };
  }
  if (position.timestamp > now + FUTURE_FIX_TOLERANCE_MS) {
    return { ok: false, reason: 'future-timestamp' };
  }

  const maxAge = source === 'current' ? CURRENT_FIX_MAX_AGE_MS : LAST_KNOWN_MAX_AGE_MS;
  if (now - position.timestamp > maxAge) {
    return { ok: false, reason: 'stale' };
  }

  return { ok: true, fix: buildGpsFix(position, source, isDevice) };
}

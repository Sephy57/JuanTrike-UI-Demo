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

/** Last-known fixes older than this are rejected rather than shown. */
export const LAST_KNOWN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Maps a platform position into a typed fix. Pure, so the source labeling is testable. */
export function buildGpsFix(
  position: PositionLike,
  source: FixSource,
  isDevice: boolean,
): GpsFix {
  return {
    coords: { latitude: position.coords.latitude, longitude: position.coords.longitude },
    accuracyM: position.coords.accuracy ?? null,
    simulated: !isDevice,
    source,
    takenAt: position.timestamp,
  };
}

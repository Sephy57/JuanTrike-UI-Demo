import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import { buildGpsFix, LAST_KNOWN_MAX_AGE_MS, type GpsFix } from './gpsFix';

export type { GpsFix } from './gpsFix';

export type GpsStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'denied'
  | 'services-disabled'
  | 'timeout'
  | 'error';

const TIMEOUT_MS = 15000;

/**
 * Foreground-only location. One-shot reads on demand; there is no watch
 * subscription, no background task, and nothing is uploaded.
 */
export function useForegroundLocation() {
  const [status, setStatus] = useState<GpsStatus>('idle');
  const [fix, setFix] = useState<GpsFix | null>(null);
  const mounted = useRef(true);
  const requestId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestId.current += 1; // Invalidate any in-flight read on unmount.
    };
  }, []);

  const refresh = useCallback(async (): Promise<GpsFix | null> => {
    const id = ++requestId.current;
    setStatus('loading');
    try {
      const current = await Location.getForegroundPermissionsAsync();
      let granted = current.status === Location.PermissionStatus.GRANTED;
      if (!granted && current.canAskAgain) {
        const asked = await Location.requestForegroundPermissionsAsync();
        granted = asked.status === Location.PermissionStatus.GRANTED;
      }
      if (!granted) {
        if (mounted.current && id === requestId.current) setStatus('denied');
        return null;
      }

      const servicesOn = await Location.hasServicesEnabledAsync();
      if (!servicesOn) {
        if (mounted.current && id === requestId.current) setStatus('services-disabled');
        return null;
      }

      // A live read is preferred. If it does not settle in time (common on
      // emulators, where a fix sent before the request is not re-delivered),
      // fall back to the cached last-known position, labeled as such.
      let source: GpsFix['source'] = 'current';
      let position = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        TIMEOUT_MS,
      );
      if (!position) {
        source = 'last-known';
        position = await Location.getLastKnownPositionAsync({
          maxAge: LAST_KNOWN_MAX_AGE_MS,
        });
      }
      if (!position) {
        if (mounted.current && id === requestId.current) setStatus('timeout');
        return null;
      }

      const next = buildGpsFix(position, source, Device.isDevice);
      if (mounted.current && id === requestId.current) {
        setFix(next);
        setStatus('ready');
      }
      return next;
    } catch {
      if (mounted.current && id === requestId.current) setStatus('error');
      return null;
    }
  }, []);

  return { status, fix, refresh };
}

/** Resolves to null if the promise does not settle within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

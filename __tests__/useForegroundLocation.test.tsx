import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useForegroundLocation } from '../src/location/useForegroundLocation';
import { LAST_KNOWN_MAX_AGE_MS } from '../src/location/gpsFix';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
}));

jest.mock('expo-device', () => ({ isDevice: true }));

type LocationHook = ReturnType<typeof useForegroundLocation>;
type LocationHookResult = { current: LocationHook };

const mockLocation = Location as jest.Mocked<typeof Location>;

function recentPosition(): Location.LocationObject {
  return {
    coords: {
      latitude: 15.1466,
      longitude: 120.5879,
      altitude: null,
      accuracy: 8,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  };
}

function permissionResponse(granted: boolean, canAskAgain = !granted): Location.LocationPermissionResponse {
  return {
    status: granted ? Location.PermissionStatus.GRANTED : Location.PermissionStatus.DENIED,
    canAskAgain,
    expires: 'never',
    granted,
  };
}

async function mount(): Promise<{ result: LocationHookResult }> {
  const rendered = await renderHook(() => useForegroundLocation());
  return { result: rendered.result };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLocation.getForegroundPermissionsAsync.mockResolvedValue(permissionResponse(true));
  mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);
  mockLocation.getCurrentPositionAsync.mockResolvedValue(recentPosition());
  mockLocation.getLastKnownPositionAsync.mockResolvedValue(null);
});

describe('useForegroundLocation', () => {
  it('uses a validated one-shot foreground fix without starting background tracking', async () => {
    const { result } = await mount();
    let fix = null;
    await act(async () => {
      fix = await result.current.refresh();
    });

    expect(result.current.status).toBe('ready');
    expect(fix).toMatchObject({ source: 'current', simulated: false, accuracyM: 8 });
    expect(mockLocation.getForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
    expect(mockLocation.getLastKnownPositionAsync).not.toHaveBeenCalled();
  });

  it('reports permission denial without reading coordinates', async () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue(permissionResponse(false, false));
    const { result } = await mount();
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.status).toBe('denied');
    expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(mockLocation.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('reports disabled device location services before reading coordinates', async () => {
    mockLocation.hasServicesEnabledAsync.mockResolvedValue(false);
    const { result } = await mount();
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.status).toBe('services-disabled');
    expect(mockLocation.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('falls back to a fresh last-known fix when the live position is invalid', async () => {
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      ...recentPosition(),
      coords: { ...recentPosition().coords, latitude: 95 },
    });
    const cached = recentPosition();
    mockLocation.getLastKnownPositionAsync.mockResolvedValue(cached);
    const { result } = await mount();
    let fix = null;
    await act(async () => {
      fix = await result.current.refresh();
    });

    expect(result.current.status).toBe('ready');
    expect(fix).toMatchObject({
      source: 'last-known',
      coords: { latitude: cached.coords.latitude, longitude: cached.coords.longitude },
      simulated: false,
    });
    expect(mockLocation.getLastKnownPositionAsync).toHaveBeenCalledWith({ maxAge: LAST_KNOWN_MAX_AGE_MS });
  });

  it('falls back to a fresh last-known fix when the live read rejects', async () => {
    mockLocation.getCurrentPositionAsync.mockRejectedValue(new Error('provider unavailable'));
    const cached = recentPosition();
    mockLocation.getLastKnownPositionAsync.mockResolvedValue(cached);
    const { result } = await mount();
    let fix = null;
    await act(async () => {
      fix = await result.current.refresh();
    });

    expect(result.current.status).toBe('ready');
    expect(fix).toMatchObject({
      source: 'last-known',
      coords: { latitude: cached.coords.latitude, longitude: cached.coords.longitude },
    });
  });

  it('reports stale data when neither a current nor cached position passes the age checks', async () => {
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      ...recentPosition(),
      timestamp: Date.now() - 3 * 60 * 1000,
    });
    const { result } = await mount();
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.status).toBe('stale-fix');
    expect(result.current.fix).toBeNull();
  });
});

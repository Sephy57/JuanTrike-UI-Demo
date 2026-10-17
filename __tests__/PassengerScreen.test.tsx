import React, { useEffect } from 'react';
import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DemoProvider, useDemoState } from '../src/booking/DemoContext';
import type { Place } from '../src/booking/bookingMachine';
import { demoFareFor, DEMO_DESTINATION_COORDS, DEMO_PICKUP_COORDS, formatCoords, haversineKm } from '../src/booking/geo';
import { PassengerScreen } from '../src/screens/PassengerScreen';

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('../src/components/MapView', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const { Pressable, View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    InteractiveMap: ({ onTapCoords }: { onTapCoords?: (coords: { latitude: number; longitude: number }) => void }) =>
      ReactModule.createElement(
        View,
        { testID: 'map-view' },
        ReactModule.createElement(Pressable, {
          testID: 'map-tap-pickup',
          onPress: () => onTapCoords?.({ latitude: 15.1466, longitude: 120.5879 }),
        }),
        ReactModule.createElement(Pressable, {
          testID: 'map-tap-destination',
          onPress: () => onTapCoords?.({ latitude: 15.1372, longitude: 120.5968 }),
        }),
        ReactModule.createElement(Pressable, {
          testID: 'map-tap-outside-coverage',
          onPress: () => onTapCoords?.({ latitude: 15.14, longitude: 120.607 }),
        }),
      ),
  };
});

const pickup: Place = { label: 'Chacon St, Villa Paz', coords: DEMO_PICKUP_COORDS, source: 'demo' };
const destination: Place = { label: 'J. Surla St, Pulungbulu', coords: DEMO_DESTINATION_COORDS, source: 'demo' };

function Passenger({ seeded = false }: { seeded?: boolean }) {
  const { dispatch } = useDemoState();
  useEffect(() => {
    if (seeded) dispatch({ type: 'RESTORE_DEMO_LOCATIONS', pickup, destination });
  }, [dispatch, seeded]);
  return <PassengerScreen onOpenPanel={jest.fn()} onSwitchMode={jest.fn()} />;
}

function renderPassenger(seeded = false) {
  return render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 393, height: 873 }, insets: { top: 24, right: 0, bottom: 24, left: 0 } }}>
      <DemoProvider>
        <Passenger seeded={seeded} />
      </DemoProvider>
    </SafeAreaProvider>,
  );
}

describe('PassengerScreen reference layout', () => {
  it('keeps a native map, floating pickup/destination card, fare summary and disabled booking action visible when empty', async () => {
    const screen = await renderPassenger();

    expect(screen.getByTestId('map-view')).toBeTruthy();
    expect(screen.getByTestId('juantrike-brand-logo')).toBeTruthy();
    expect(screen.queryByText('Choose your route')).toBeNull();
    expect(screen.getByText(/Service area/)).toBeTruthy();
    expect(screen.getByTestId('passenger-location-overlay').props.pointerEvents).toBe('box-none');
    expect(screen.queryByText('DEMO MODE')).toBeNull();
    expect(screen.getByText('Estimated fare')).toBeTruthy();
    expect(screen.getByTestId('passenger-ride-summary')).toBeTruthy();
    expect(screen.getByTestId('confirm-booking')).toBeDisabled();
  });

  it('announces pickup and destination selection state to assistive technology', async () => {
    const screen = await renderPassenger();
    const pickupRow = screen.getByTestId('passenger-pickup-location');
    const destinationRow = screen.getByTestId('passenger-destination-location');

    expect(pickupRow.props.accessibilityLabel).toBe('Pickup: Tap the map to set pickup');
    expect(pickupRow.props.accessibilityState).toMatchObject({ disabled: false, selected: true });
    expect(destinationRow.props.accessibilityLabel).toBe('Destination: Tap the map to set destination');
    expect(destinationRow.props.accessibilityState).toMatchObject({ disabled: false, selected: false });
  });

  it('announces location controls as disabled after the booking is confirmed', async () => {
    const screen = await renderPassenger(true);

    fireEvent.press(screen.getByTestId('confirm-booking'));
    await waitFor(() => {
      expect(screen.getByTestId('passenger-pickup-location').props.accessibilityState).toMatchObject({ disabled: true });
      expect(screen.getByTestId('passenger-destination-location').props.accessibilityState).toMatchObject({ disabled: true });
    });
  });

  it('shows the selected route and enables booking only for locations in the demo coverage', async () => {
    const screen = await renderPassenger(true);

    expect(screen.getByText('Chacon St, Villa Paz')).toBeTruthy();
    expect(screen.getByText('J. Surla St, Pulungbulu')).toBeTruthy();
    expect(within(screen.getByTestId('passenger-ride-summary')).getByText(`₱${demoFareFor(haversineKm(pickup.coords, destination.coords))}`)).toBeTruthy();
    expect(screen.getByTestId('confirm-booking')).toBeEnabled();
  });

  it('turns map coordinate callbacks into selected locations and a valid route preview', async () => {
    const screen = await renderPassenger();

    fireEvent.press(screen.getByTestId('map-tap-pickup'));
    await waitFor(() => expect(within(screen.getByTestId('passenger-pickup-location')).getByText(formatCoords(DEMO_PICKUP_COORDS))).toBeTruthy());

    fireEvent.press(screen.getByTestId('map-tap-destination'));
    await waitFor(() => {
      expect(within(screen.getByTestId('passenger-destination-location')).getByText(formatCoords(DEMO_DESTINATION_COORDS))).toBeTruthy();
      expect(screen.getByTestId('confirm-booking')).toBeEnabled();
      expect(within(screen.getByTestId('passenger-ride-summary')).getByText(`₱${demoFareFor(haversineKm(DEMO_PICKUP_COORDS, DEMO_DESTINATION_COORDS))}`)).toBeTruthy();
    });
  });

  it('keeps booking disabled when map taps select a point outside synthetic coverage', async () => {
    const screen = await renderPassenger();

    fireEvent.press(screen.getByTestId('map-tap-outside-coverage'));
    await waitFor(() => expect(within(screen.getByTestId('passenger-pickup-location')).getByText('15.14000, 120.60700')).toBeTruthy());
    fireEvent.press(screen.getByTestId('map-tap-destination'));

    await waitFor(() => {
      expect(screen.getByTestId('confirm-booking')).toBeDisabled();
      expect(within(screen.getByTestId('passenger-destination-location')).getByText(formatCoords(DEMO_DESTINATION_COORDS))).toBeTruthy();
    });
  });

  it('swaps the selected pickup and destination without leaving the location-selection state', async () => {
    const screen = await renderPassenger(true);
    expect(within(screen.getByTestId('passenger-pickup-location')).getByText('Chacon St, Villa Paz')).toBeTruthy();
    expect(within(screen.getByTestId('passenger-destination-location')).getByText('J. Surla St, Pulungbulu')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Swap pickup and destination' }));

    await waitFor(() => {
      expect(within(screen.getByTestId('passenger-pickup-location')).getByText('J. Surla St, Pulungbulu')).toBeTruthy();
      expect(within(screen.getByTestId('passenger-destination-location')).getByText('Chacon St, Villa Paz')).toBeTruthy();
      expect(screen.getByTestId('confirm-booking')).toBeEnabled();
    });
  });
});

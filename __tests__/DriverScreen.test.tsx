import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DemoProvider, useDemoControls, useDemoState } from '../src/booking/DemoContext';
import { Place } from '../src/booking/bookingMachine';
import { DEMO_DESTINATION_COORDS, DEMO_PICKUP_COORDS } from '../src/booking/geo';
import { DriverScreen } from '../src/screens/DriverScreen';
import { colors, spacing } from '../src/theme/tokens';

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('../src/components/MapView', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { InteractiveMap: () => ReactModule.createElement(View, { testID: 'map-view' }) };
});

const pickup: Place = { label: 'DEMO Pickup A', coords: DEMO_PICKUP_COORDS, source: 'demo' };
const destination: Place = { label: 'DEMO Destination B', coords: DEMO_DESTINATION_COORDS, source: 'demo' };

function SeedActiveTrip() {
  const { dispatch } = useDemoState();
  const { setPaused } = useDemoControls();
  useEffect(() => {
    setPaused(true);
    dispatch({ type: 'RESTORE_DEMO_LOCATIONS', pickup, destination });
    dispatch({ type: 'CONFIRM_BOOKING', id: 'TEST-1', now: 1, distanceKm: 1.42, fareDemo: 39 });
    dispatch({ type: 'BEGIN_SEARCH' });
    dispatch({ type: 'OFFER_TO_DRIVER' });
    dispatch({ type: 'ACCEPT_BOOKING', driverName: 'Mang Ben' });
    dispatch({ type: 'DRIVER_EN_ROUTE' });
    dispatch({ type: 'DRIVER_ARRIVED' });
    dispatch({ type: 'START_TRIP' });
  }, [dispatch, setPaused]);
  return <DriverScreen onOpenPanel={jest.fn()} />;
}

function SeedDriverOffer() {
  const { dispatch } = useDemoState();
  useEffect(() => {
    dispatch({ type: 'RESTORE_DEMO_LOCATIONS', pickup, destination });
    dispatch({ type: 'CONFIRM_BOOKING', id: 'TEST-2', now: 1, distanceKm: 1.42, fareDemo: 39 });
    dispatch({ type: 'BEGIN_SEARCH' });
    dispatch({ type: 'OFFER_TO_DRIVER' });
  }, [dispatch]);
  return <DriverScreen onOpenPanel={jest.fn()} />;
}

describe('DriverScreen primary actions', () => {
  it('uses the reference yellow booking badge without outlining the entire offer card', async () => {
    const screen = await render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 393, height: 873 }, insets: { top: 24, right: 0, bottom: 24, left: 0 } }}>
        <DemoProvider>
          <SeedDriverOffer />
        </DemoProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('juantrike-brand-logo')).toBeTruthy();
    const offerCard = screen.getByTestId('driver-incoming-offer');
    const offerStyle = StyleSheet.flatten(offerCard.props.style);
    const offerBadgeText = within(offerCard).getByText('● New Booking Request');
    const offerBadgeStyle = StyleSheet.flatten(offerBadgeText.parent?.props.style);

    expect(offerStyle.borderColor).toBe(colors.border);
    expect(offerStyle.gap).toBe(spacing.xs);
    expect(offerBadgeStyle.backgroundColor).toBe(colors.accent);
    expect(screen.getByText('Trips today')).toBeTruthy();
    expect(screen.getByText('Estimated earnings')).toBeTruthy();

    const ratingTile = screen.getByTestId('driver-rating-stat');
    expect(within(ratingTile).getByText('★ 4.9')).toBeTruthy();
      expect(within(ratingTile).getByText('Demo rating')).toBeTruthy();
  });

  it('keeps timed offer accept and decline controls pinned outside the scrollable sheet', async () => {
    const screen = await render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 1080, height: 1920 }, insets: { top: 0, right: 0, bottom: 0, left: 0 } }}>
        <DemoProvider>
          <SeedDriverOffer />
        </DemoProvider>
      </SafeAreaProvider>,
    );

    const sticky = await screen.findByTestId('driver-sticky-actions');
    expect(within(sticky).getByText('Accept')).toBeTruthy();
    expect(within(sticky).getByText('Decline')).toBeTruthy();
    expect(within(screen.getByTestId('driver-sheet-scroll')).queryByText('Accept')).toBeNull();
    expect(screen.getByTestId('driver-summary-stats')).toBeTruthy();
    const offerCard = screen.getByTestId('driver-incoming-offer');
    expect(within(offerCard).getByText('Juan dela Cruz')).toBeTruthy();
    expect(within(offerCard).queryByText('Mang Ben')).toBeNull();
    expect(screen.getByText('Ride queue')).toBeTruthy();
    expect(screen.getByText('No other ride requests right now.')).toBeTruthy();
    expect(screen.queryByText(/Ramon Santos|Alyssa Reyes/)).toBeNull();
    expect(screen.queryByText('DEMO MODE')).toBeNull();
    expect(screen.getByTestId('driver-route-preview')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('driver-route-preview').props.style).height).toBe(132);
    expect(screen.queryByText('Navigation')).toBeNull();
    expect(screen.getByTestId('driver-fifo-queue')).toBeTruthy();
  });

  it('connects the compact online toggle to shared driver availability', async () => {
    const screen = await render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 393, height: 873 }, insets: { top: 24, right: 0, bottom: 24, left: 0 } }}>
        <DemoProvider>
          <DriverScreen onOpenPanel={jest.fn()} />
        </DemoProvider>
      </SafeAreaProvider>,
    );

    const toggle = screen.getByRole('switch');
    expect(toggle.props.accessibilityState).toMatchObject({ checked: true });
    fireEvent.press(toggle);
    await waitFor(() => expect(screen.getByRole('switch').props.accessibilityState).toMatchObject({ checked: false }));
  });

  it('keeps the active-trip completion action pinned outside the scrollable sheet', async () => {
    const screen = await render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 1080, height: 1920 }, insets: { top: 0, right: 0, bottom: 0, left: 0 } }}>
        <DemoProvider>
          <SeedActiveTrip />
        </DemoProvider>
      </SafeAreaProvider>,
    );

    const sticky = await screen.findByTestId('driver-sticky-single');
    expect(within(sticky).getByTestId('complete-trip')).toBeTruthy();
    expect(within(screen.getByTestId('driver-sheet-scroll')).queryByTestId('complete-trip')).toBeNull();
  });

  it('shows trip progress before the map and keeps route metrics ahead of driver details', async () => {
    const screen = await render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 393, height: 873 }, insets: { top: 24, right: 0, bottom: 24, left: 0 } }}>
        <DemoProvider>
          <SeedActiveTrip />
        </DemoProvider>
      </SafeAreaProvider>,
    );

    const activeTrip = await screen.findByTestId('driver-active-trip');
    const orderedSections = [
      'driver-trip-status',
      'driver-trip-progress-steps',
      'driver-route-preview',
      'driver-trip-metrics',
      'driver-trip-identity',
    ];
    const childIds = activeTrip.children.map((child) => typeof child === 'string' ? undefined : child.props.testID);

    expect(orderedSections.map((id) => childIds.indexOf(id))).toEqual([0, 1, 2, 3, 4]);
  });
});

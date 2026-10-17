import React from 'react';
import { act, render } from '@testing-library/react-native';
import { InteractiveMap } from '../src/components/MapView';
import { DEMO_ZONES } from '../src/booking/demoZones';

const mockCaptureWebViewProps = jest.fn();
const mockAddNetworkStateListener = jest.fn();

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addNetworkStateListener: (listener: (state: { isConnected: boolean; isInternetReachable: boolean }) => void) => {
    mockAddNetworkStateListener(listener);
    return { remove: jest.fn() };
  },
}));

jest.mock('react-native-webview', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const MockWebView = ReactModule.forwardRef((props: Record<string, unknown>, _ref) => {
    mockCaptureWebViewProps(props);
    return null;
  });
  MockWebView.displayName = 'MockWebView';
  return { __esModule: true, default: MockWebView };
});

type WebViewProps = {
  source: { html: string };
  applicationNameForUserAgent: string;
  onMessage: (event: { nativeEvent: { data: string } }) => void;
};

function latestWebViewProps(): WebViewProps {
  const calls = mockCaptureWebViewProps.mock.calls;
  return calls[calls.length - 1][0] as WebViewProps;
}

describe('InteractiveMap', () => {
  beforeEach(() => mockCaptureWebViewProps.mockClear());

  it('keeps bundled map overlays usable offline and announces network changes', async () => {
    const screen = await render(
      <InteractiveMap
        center={{ latitude: 15.1466, longitude: 120.5879 }}
        markers={{ pickup: { latitude: 15.1466, longitude: 120.5879 } }}
        loadingLabel="Loading map"
        errorLabel="Map unavailable"
        offlineLabel="Offline map: routes and coverage remain available"
        attribution="© OpenStreetMap contributors · boundary: geoBoundaries.org"
      />,
    );

    const webView = latestWebViewProps();
    expect(webView.source.html).toContain('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(webView.source.html).toContain('.setView(CENTER, 13)');
    expect(webView.source.html).not.toContain('map.fitBounds(cityBounds.pad');
    expect(webView.source.html).toContain('.pin.dest{background:#D6453D;}');
    expect(DEMO_ZONES.find((zone) => zone.id === 'TODA-A')?.color).toBe('#1E9E5A');
    expect(webView.source.html).toContain('id="fallback-svg"');
    expect(webView.source.html).toContain('function renderFallback');
    expect(webView.applicationNameForUserAgent).toContain('JuanTrike/1.0.0');
    expect(screen.getByText('© OpenStreetMap contributors · boundary: geoBoundaries.org')).toBeTruthy();

    const listener = mockAddNetworkStateListener.mock.calls[0][0] as (state: { isConnected: boolean; isInternetReachable: boolean }) => void;
    await act(async () => {
      listener({ isConnected: false, isInternetReachable: false });
    });
    expect(screen.getByText('Offline map: routes and coverage remain available')).toBeTruthy();

    await act(async () => {
      webView.onMessage({ nativeEvent: { data: JSON.stringify({ type: 'ready' }) } });
      webView.onMessage({ nativeEvent: { data: JSON.stringify({ type: 'net', online: true }) } });
    });
    expect(screen.getByText('Offline map: routes and coverage remain available')).toBeTruthy();

    await act(async () => {
      listener({ isConnected: true, isInternetReachable: true });
    });
    expect(screen.queryByText('Offline map: routes and coverage remain available')).toBeNull();
  });

  it('forwards Leaflet background taps and marker taps through the WebView bridge', async () => {
    const onTapCoords = jest.fn();
    const onMarkerTap = jest.fn();
    await render(
      <InteractiveMap
        center={{ latitude: 15.1466, longitude: 120.5879 }}
        markers={{ pickup: { latitude: 15.1466, longitude: 120.5879 } }}
        onTapCoords={onTapCoords}
        onMarkerTap={onMarkerTap}
        loadingLabel="Loading map"
        errorLabel="Map unavailable"
        attribution="© OpenStreetMap contributors"
      />,
    );

    const webView = latestWebViewProps();
    expect(webView.source.html).toContain("map.on('click', function(e){ post({ type:'tap', latitude: e.latlng.lat, longitude: e.latlng.lng }); });");
    await act(async () => {
      webView.onMessage({ nativeEvent: { data: JSON.stringify({ type: 'tap', latitude: 15.145, longitude: 120.59 }) } });
      webView.onMessage({ nativeEvent: { data: JSON.stringify({ type: 'marker', id: 'pickup' }) } });
    });

    expect(onTapCoords).toHaveBeenCalledWith({ latitude: 15.145, longitude: 120.59 });
    expect(onMarkerTap).toHaveBeenCalledWith('pickup');
  });

  it('lets map taps pass through the TODA coverage polygons', async () => {
    await render(
      <InteractiveMap
        center={{ latitude: 15.1466, longitude: 120.5879 }}
        markers={{}}
        zones={DEMO_ZONES}
        loadingLabel="Loading map"
        errorLabel="Map unavailable"
        attribution="© OpenStreetMap contributors"
      />,
    );

    const html = latestWebViewProps().source.html;
    expect(html).toContain("L.polygon(latlngs, Object.assign({}, style, { interactive:false }))");
    expect(html).not.toContain("el.on('click', function(){ post({ type:'marker', id:'zone:'");
  });
});

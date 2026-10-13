import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import type { LatLng } from '../booking/bookingMachine';
import type { DemoZone } from '../booking/demoZones';
import { colors, spacing } from '../theme/tokens';

export interface MapMarkers {
  pickup?: LatLng | null;
  destination?: LatLng | null;
  /** Real GPS fix, when the device provides one. */
  current?: LatLng | null;
  /** Simulated vehicle position during the demo. */
  vehicle?: LatLng | null;
}

export interface MapFocus {
  coords: LatLng;
  /** Change this value to force the map to re-centre on `coords`. */
  key: number;
}

interface Props {
  center: LatLng;
  markers: MapMarkers;
  focus?: MapFocus | null;
  onTapCoords?: (coords: LatLng) => void;
  /** Synthetic TODA coverage polygons. Drawn under markers. */
  zones?: DemoZone[];
  /** SIMULATED route polyline. Never a real navigation route. */
  route?: LatLng[] | null;
  loadingLabel: string;
  errorLabel: string;
  attribution: string;
  height?: number | string;
}

type TileState = 'loading' | 'ready' | 'error';

/**
 * Interactive OpenStreetMap map rendered with Leaflet inside a WebView.
 * Works in Expo Go and does not need a Google Maps API key. If Leaflet or the
 * tiles cannot load, the synthetic zones are still drawn as an SVG fallback.
 */
export function InteractiveMap({
  center,
  markers,
  focus,
  onTapCoords,
  zones = [],
  route = null,
  loadingLabel,
  errorLabel,
  attribution,
  height = '100%',
}: Props) {
  const webRef = useRef<WebView>(null);
  const [tileState, setTileState] = useState<TileState>('loading');
  const [pageReady, setPageReady] = useState(false);

  const html = useMemo(
    () => buildMapHtml(center, attribution, zones),
    // The HTML is built once; later updates are pushed through injected JS.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const push = useCallback((payload: object) => {
    webRef.current?.injectJavaScript(`window.applyState(${JSON.stringify(payload)}); true;`);
  }, []);

  React.useEffect(() => {
    if (!pageReady) return;
    push({ markers, focus: focus ?? null, route });
  }, [markers, focus, route, pageReady, push]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as
        | { type: 'tiles'; state: TileState }
        | { type: 'tap'; latitude: number; longitude: number }
        | { type: 'ready' }
        | { type: 'jsError'; message: string };
      if (msg.type === 'jsError') console.warn('[map]', msg.message);
      if (msg.type === 'tiles') setTileState(msg.state);
      if (msg.type === 'ready') setPageReady(true);
      if (msg.type === 'tap') onTapCoords?.({ latitude: msg.latitude, longitude: msg.longitude });
    } catch {
      // Ignore malformed messages from the page.
    }
  };

  return (
    <View style={[styles.container, { height: height as number }]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        onMessage={onMessage}
        onError={() => setTileState('error')}
        onHttpError={() => setTileState('error')}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
      />
      {/* Status banners never cover the map, so zones and markers stay visible. */}
      {tileState === 'loading' && (
        <View style={styles.banner} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.bannerText}>{loadingLabel}</Text>
        </View>
      )}
      {tileState === 'error' && (
        <View style={[styles.banner, styles.bannerError]} pointerEvents="none">
          <Text style={[styles.bannerText, { color: colors.danger }]}>{errorLabel}</Text>
        </View>
      )}
    </View>
  );
}

function buildMapHtml(center: LatLng, attribution: string, zones: DemoZone[]): string {
  const safeAttribution = JSON.stringify(attribution);
  const zoneData = JSON.stringify(
    zones.map((z) => ({ id: z.id, label: z.label, color: z.color, ring: z.ring })),
  );
  return `<!doctype html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" integrity="sha256-tXCrvaljxgtN5LT/Syb5Mm9T+yzPFGH98JVcoJT7JTk=" crossorigin=""/>
<style>
  html,body,#map{height:100%;margin:0;padding:0;background:#E9EEF5;}
  #fallback{position:absolute;inset:0;display:none;}
  #fallback svg{width:100%;height:100%;}
  .pin{width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);}
  .pin.pickup{background:#1E9E5A;}
  .pin.dest{background:#F2A900;}
  .dot{width:18px;height:18px;border-radius:50%;background:#1F5FBF;border:3px solid #fff;box-shadow:0 0 0 6px rgba(31,95,191,.25);}
  .car{width:22px;height:22px;border-radius:6px;background:#1F5FBF;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);}
  .leaflet-control-attribution{font-size:10px;}
</style>
</head><body>
<div id="map"></div>
<div id="fallback"><svg id="fallback-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"></svg></div>
<script>
  // Shared state for both the Leaflet map and the SVG fallback.
  var ZONES = ${zoneData};
  var lastState = { markers: {}, focus: null, route: null };
  function post(o){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  // Forward page script errors to the app log so a blank map can be diagnosed.
  window.onerror = function(message, source, line){ post({ type: 'jsError', message: String(message) + ' @' + line }); return false; };
  function fallbackOn(){ document.getElementById('map').style.display='none'; document.getElementById('fallback').style.display='block'; post({ type: 'tiles', state: 'error' }); }
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" integrity="sha256-XJrs/DDkVkUZ29zdzFOkGCJ9zHVo5hnpdi3c7HYJ7Uc=" crossorigin="" onerror="fallbackOn()"></script>
<script>
  // Fallback: draws the synthetic zones as SVG when Leaflet cannot be loaded.
  function renderFallback(s){
    var svg = document.getElementById('fallback-svg');
    var lats = [], lons = [];
    ZONES.forEach(function(z){ z.ring.forEach(function(p){ lats.push(p.latitude); lons.push(p.longitude); }); });
    var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats);
    var minLon = Math.min.apply(null, lons), maxLon = Math.max.apply(null, lons);
    var pad = 0.01, W = 1000, H = 1000;
    function xy(p){ return [ (p.longitude - (minLon - pad)) / ((maxLon - minLon) + 2*pad) * W, (1 - (p.latitude - (minLat - pad)) / ((maxLat - minLat) + 2*pad)) * H ]; }
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var out = '<rect width="' + W + '" height="' + H + '" fill="#E9EEF5"/>';
    ZONES.forEach(function(z){
      var pts = z.ring.map(function(p){ return xy(p).join(','); }).join(' ');
      out += '<polygon points="' + pts + '" fill="' + z.color + '" fill-opacity="0.14" stroke="' + z.color + '" stroke-width="5"/>';
      var c = xy(z.ring[0]);
      out += '<text x="' + (c[0] + 18) + '" y="' + (c[1] + 40) + '" font-size="34" font-family="sans-serif" fill="' + z.color + '">' + z.label + '</text>';
    });
    if (s.route && s.route.length) {
      out += '<polyline points="' + s.route.map(function(p){ return xy(p).join(','); }).join(' ') + '" fill="none" stroke="#1F5FBF" stroke-width="6" stroke-dasharray="18 12"/>';
    }
    var m = s.markers || {};
    if (m.pickup) { var a = xy(m.pickup); out += '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="22" fill="#1E9E5A" stroke="#fff" stroke-width="6"/>'; }
    if (m.destination) { var b = xy(m.destination); out += '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="22" fill="#F2A900" stroke="#fff" stroke-width="6"/>'; }
    if (m.vehicle) { var v = xy(m.vehicle); out += '<rect x="' + (v[0]-20) + '" y="' + (v[1]-20) + '" width="40" height="40" rx="10" fill="#1F5FBF" stroke="#fff" stroke-width="6"/>'; }
    svg.innerHTML = out;
  }

  if (typeof L === 'undefined') {
    // Leaflet did not load (offline). The fallback is driven by applyState below.
  } else {
    var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([${center.latitude}, ${center.longitude}], 15);
    var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: ${safeAttribution}
    });
    var tileErrorSent = false;
    tiles.on('loading', function(){ post({ type: 'tiles', state: 'loading' }); });
    tiles.on('load', function(){ post({ type: 'tiles', state: 'ready' }); });
    tiles.on('tileerror', function(){
      if (!tileErrorSent) { tileErrorSent = true; post({ type: 'tiles', state: 'error' }); }
    });
    tiles.addTo(map);

    // Zones are static and get their own layer; overlay holds the route and is cleared per update.
    var zoneLayer = L.layerGroup().addTo(map);
    var overlay = L.layerGroup().addTo(map);
    var layer = L.layerGroup().addTo(map);
    function pinIcon(cls){ return L.divIcon({ className: '', html: '<div class="pin ' + cls + '"></div>', iconSize: [28, 28], iconAnchor: [14, 28] }); }
    var dotIcon = L.divIcon({ className: '', html: '<div class="dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
    var carIcon = L.divIcon({ className: '', html: '<div class="car"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });

    ZONES.forEach(function(z){
      L.polygon(z.ring.map(function(p){ return [p.latitude, p.longitude]; }), { color: z.color, weight: 2, fillOpacity: 0.12 })
        .bindTooltip(z.label, { sticky: true }).addTo(zoneLayer);
    });

    map.on('click', function(e){ post({ type: 'tap', latitude: e.latlng.lat, longitude: e.latlng.lng }); });

    window.applyState = function(s){
      lastState = s;
      overlay.clearLayers();
      if (s.route && s.route.length) {
        L.polyline(s.route.map(function(p){ return [p.latitude, p.longitude]; }), { color: '#1F5FBF', weight: 4, dashArray: '8 6' }).addTo(overlay);
      }
      layer.clearLayers();
      var m = s.markers || {};
      if (m.pickup) L.marker([m.pickup.latitude, m.pickup.longitude], { icon: pinIcon('pickup') }).addTo(layer);
      if (m.destination) L.marker([m.destination.latitude, m.destination.longitude], { icon: pinIcon('dest') }).addTo(layer);
      if (m.current) L.marker([m.current.latitude, m.current.longitude], { icon: dotIcon, interactive: false }).addTo(layer);
      if (m.vehicle) L.marker([m.vehicle.latitude, m.vehicle.longitude], { icon: carIcon, interactive: false }).addTo(layer);
      if (s.focus && s.focus.coords) map.setView([s.focus.coords.latitude, s.focus.coords.longitude], map.getZoom(), { animate: true });
    };
  }

  // Keep the fallback in sync whenever state arrives while Leaflet is missing.
  var originalApply = window.applyState;
  window.applyState = function(s){
    lastState = s;
    if (typeof L === 'undefined') { renderFallback(s); return; }
    if (originalApply) originalApply(s);
  };
  if (typeof L === 'undefined') { renderFallback(lastState); fallbackOn(); }
  post({ type: 'ready' });
</script>
</body></html>`;
}

const styles = StyleSheet.create({
  container: { width: '100%', backgroundColor: colors.primarySoft, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: 'transparent' },
  banner: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  bannerError: { backgroundColor: 'rgba(255,240,240,0.95)' },
  bannerText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', flexShrink: 1 },
});

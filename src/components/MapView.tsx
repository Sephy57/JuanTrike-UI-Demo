import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as Network from 'expo-network';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import type { LatLng } from '../booking/bookingMachine';
import type { DemoTerminal, DemoZone } from '../booking/demoZones';
import type { CityBoundaryGeometry } from '../booking/cityBoundary';
import { LEAFLET_CSS, LEAFLET_JS } from '../map/leafletAssets';
import { colors, radius, spacing } from '../theme/tokens';

export interface MapMarkers {
  pickup?: LatLng | null;
  destination?: LatLng | null;
  /** Real GPS fix, when the device provides one. */
  current?: LatLng | null;
  /** Simulated vehicle position during the demo. */
  vehicle?: LatLng | null;
  /** Direction the simulated vehicle faces, degrees clockwise from north. */
  vehicleHeading?: number | null;
}

export interface MapFocus {
  coords: LatLng;
  /** Change this value to force the map to re-centre on `coords`. */
  key: number;
  /** Zoom level to jump to. Omit to keep the current zoom. */
  zoom?: number;
}

/** One drawn polyline. Segments are split by the caller so the map stays dumb. */
export interface RouteLayer {
  id: string;
  points: LatLng[];
  color: string;
  width?: number;
  dashed?: boolean;
  opacity?: number;
}

export type MarkerId = 'pickup' | 'destination' | 'current' | 'vehicle' | `terminal:${string}` | `zone:${string}`;

interface Props {
  center: LatLng;
  markers: MapMarkers;
  focus?: MapFocus | null;
  /** Continuous camera tracking. Null stops tracking; the page throttles pans. */
  follow?: { coords: LatLng; key: number } | null;
  onTapCoords?: (coords: LatLng) => void;
  /** Fired when the user taps a marker instead of the map background. */
  onMarkerTap?: (id: MarkerId) => void;
  /** Synthetic TODA coverage polygons. */
  zones?: DemoZone[];
  /** Mapped city jurisdiction outline, separate from synthetic TODA coverage. */
  cityBoundary?: CityBoundaryGeometry | null;
  /** Zone that currently contains the selected point, if any. */
  activeZoneId?: string | null;
  /** False when the pickup or destination sits outside every synthetic zone. */
  coverageOk?: boolean;
  /** Synthetic terminals drawn as secondary markers. */
  terminals?: DemoTerminal[];
  /** Polylines to draw, in order. Rebuilt only when a line actually changes. */
  layers?: RouteLayer[];
  selectedMarker?: MarkerId | null;
  loadingLabel: string;
  errorLabel: string;
  offlineLabel?: string | null;
  attribution: string;
  height?: number | string;
}

type TileState = 'loading' | 'ready' | 'error';

interface PageState {
  markers: MapMarkers;
  layers: RouteLayer[];
  zones: DemoZone[];
  terminals: DemoTerminal[];
  activeZoneId: string | null;
  coverageOk: boolean;
  focus: MapFocus | null;
  follow: { coords: LatLng; key: number } | null;
  selectedMarker: MarkerId | null;
}

/**
 * Interactive OpenStreetMap map: Leaflet runs inside a WebView from a bundle
 * shipped with the app, so the map engine itself never needs the network. Tiles
 * come from OpenStreetMap while the device is online; offline, the synthetic
 * coverage, markers and bundled routes are still drawn and the UI says so.
 */
export function InteractiveMap({
  center,
  markers,
  focus,
  follow,
  onTapCoords,
  onMarkerTap,
  zones = [],
  cityBoundary = null,
  activeZoneId = null,
  coverageOk = true,
  terminals = [],
  layers = [],
  selectedMarker = null,
  loadingLabel,
  errorLabel,
  offlineLabel,
  attribution,
  height = '100%',
}: Props) {
  const webRef = useRef<WebView>(null);
  const [tileState, setTileState] = useState<TileState>('loading');
  const [pageReady, setPageReady] = useState(false);
  const [webOnline, setWebOnline] = useState(true);
  const [nativeOnline, setNativeOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    let newerListenerEventReceived = false;
    const applyNetworkState = (state: Network.NetworkState) => {
      if (!mounted) return;
      const reachable = state.isInternetReachable ?? state.isConnected;
      if (typeof reachable === 'boolean') setNativeOnline(reachable);
    };
    Network.getNetworkStateAsync()
      .then((state) => {
        if (!newerListenerEventReceived) applyNetworkState(state);
      })
      .catch(() => undefined);
    const subscription = Network.addNetworkStateListener((state) => {
      newerListenerEventReceived = true;
      applyNetworkState(state);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  // The HTML changes only when its static map configuration changes. Runtime
  // updates (markers, routes, coverage state) are pushed into the live WebView.
  const html = useMemo(() => buildMapHtml(center, zones, cityBoundary), [center, zones, cityBoundary]);

  const push = useCallback((payload: Partial<PageState>) => {
    webRef.current?.injectJavaScript(`window.applyState(${JSON.stringify(payload)}); true;`);
  }, []);

  const zonesKey = JSON.stringify(zones);
  const terminalsKey = JSON.stringify(terminals);

  useEffect(() => {
    if (!pageReady) return;
    push({
      markers,
      focus: focus ?? null,
      follow: follow ?? null,
      layers,
      zones,
      terminals,
      activeZoneId,
      coverageOk,
      selectedMarker,
    });
    // `zones`/`terminals` are compared by JSON because they are module constants
    // whose identity never changes; re-sending them costs one small string.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pageReady,
    push,
    markers,
    focus,
    follow,
    layers,
    zonesKey,
    terminalsKey,
    activeZoneId,
    coverageOk,
    selectedMarker,
  ]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as
        | { type: 'tiles'; state: TileState }
        | { type: 'net'; online: boolean }
        | { type: 'tap'; latitude: number; longitude: number }
        | { type: 'marker'; id: string }
        | { type: 'ready' }
        | { type: 'jsError'; message: string };
      if (msg.type === 'jsError') console.warn('[map]', msg.message);
      if (msg.type === 'tiles') setTileState(msg.state);
      if (msg.type === 'net') setWebOnline(msg.online);
      if (msg.type === 'ready') setPageReady(true);
      if (msg.type === 'tap') onTapCoords?.({ latitude: msg.latitude, longitude: msg.longitude });
      if (msg.type === 'marker') onMarkerTap?.(msg.id as MarkerId);
    } catch {
      // Ignore malformed messages from the page.
    }
  };

  const offline = !(nativeOnline ?? webOnline);
  const showLoading = tileState === 'loading' && !offline;
  const showError = tileState === 'error' && !offline;

  return (
    <View style={[styles.container, { height: height as number }]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        applicationNameForUserAgent="JuanTrike/1.0.0 (+https://github.com/Sephy57/JuanTrike-UI-Demo)"
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
        setSupportMultipleWindows={false}
      />
      {/* Status banners never cover the map, so zones and markers stay visible. */}
      {showLoading && (
        <View style={styles.banner} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.bannerText}>{loadingLabel}</Text>
        </View>
      )}
      {offline && offlineLabel ? (
        <View style={[styles.banner, styles.bannerOffline]} pointerEvents="none">
          <Text style={styles.bannerOfflineText}>{offlineLabel}</Text>
        </View>
      ) : null}
      {showError && (
        <View style={[styles.banner, styles.bannerError]} pointerEvents="none">
          <Text style={[styles.bannerText, { color: colors.danger }]}>{errorLabel}</Text>
        </View>
      )}
      <View style={styles.attribution} pointerEvents="none">
        <Text style={styles.attributionText} numberOfLines={2}>
          {attribution}
        </Text>
      </View>
    </View>
  );
}

function buildMapHtml(center: LatLng, zones: DemoZone[], cityBoundary: CityBoundaryGeometry | null): string {
  const rings = zones.map((z) => z.ring.map((p) => [p.latitude, p.longitude] as [number, number]));
  const cityPolygons = cityBoundary
    ? cityBoundary.type === 'Polygon'
      ? [cityBoundary.coordinates]
      : cityBoundary.coordinates
    : [];
  const cityRings = cityPolygons.map((polygon) =>
    polygon.map((ring) => ring.map(([longitude, latitude]) => ({ latitude, longitude }))),
  );
  return `<!doctype html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>${LEAFLET_CSS}</style>
<style>
  html,body,#map{height:100%;margin:0;padding:0;background:#E9EEF5;}
  #fallback{position:absolute;inset:0;display:none;}
  #fallback svg{width:100%;height:100%;}
  .leaflet-container{background:#E9EEF5;font-family:-apple-system,Roboto,sans-serif;}
  .pin{width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.32);display:flex;align-items:center;justify-content:center;}
  .pin::after{content:'';width:7px;height:7px;border-radius:50%;background:#fff;}
  .pin.pickup{background:#1E9E5A;}
  .pin.dest{background:#D6453D;}
  .pin.selected{box-shadow:0 0 0 4px rgba(31,95,191,.4),0 2px 5px rgba(0,0,0,.32);}
  .gps{width:15px;height:15px;border-radius:50%;background:#0E7C93;border:2px solid #fff;box-shadow:0 0 0 4px rgba(14,124,147,.25);}
  .veh{width:24px;height:24px;border-radius:50%;background:#1F5FBF;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.32);display:flex;align-items:center;justify-content:center;}
  .vehArrow{color:#fff;font-size:13px;line-height:1;transition:transform .25s linear;}
  .veh.selected{box-shadow:0 0 0 5px rgba(31,95,191,.4),0 3px 8px rgba(0,0,0,.35);}
  .term{width:20px;height:20px;border-radius:5px;background:#0E2E63;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;}
  .term.selected{box-shadow:0 0 0 5px rgba(14,46,99,.4);}
  .leaflet-control-attribution{display:none;}
</style>
</head><body>
<div id="map"></div>
<div id="fallback"><svg id="fallback-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"></svg></div>
<script>
  // Shared state for both the Leaflet map and the SVG fallback.
  var CENTER = [${center.latitude}, ${center.longitude}];
  var RINGS = ${JSON.stringify(rings)};
  var CITY_GEOMETRY = ${JSON.stringify(cityBoundary)};
  var CITY_RINGS = ${JSON.stringify(cityRings)};
  var lastState = { markers: {}, layers: [], zones: [], terminals: [], focus: null, follow: null };
  function post(o){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  window.onerror = function(message, source, line){ post({ type: 'jsError', message: String(message) + ' @' + line }); return false; };
  function fallbackOn(){ document.getElementById('map').style.display='none'; document.getElementById('fallback').style.display='block'; post({ type: 'tiles', state: 'error' }); }
</script>
<script>${LEAFLET_JS}</script>
<script>
  var map = null, tiles = null;
  var zoneEls = {}, markerEls = {}, layerEls = {}, layerSig = {};
  var lastFocusKey = null, lastFollowKey = null, lastFollowAt = 0, tileErrorSent = false;

  // ------------------------------------------------------------- SVG fallback
  function renderFallback(s){
    var svg = document.getElementById('fallback-svg');
    if (!svg) return;
    var pts = [];
    (CITY_RINGS || []).forEach(function(polygon){ polygon.forEach(function(r){ r.forEach(function(p){ pts.push(p); }); }); });
    (s.zones || []).forEach(function(z){ z.ring.forEach(function(p){ pts.push(p); }); });
    (s.layers || []).forEach(function(l){ (l.points || []).forEach(function(p){ pts.push(p); }); });
    if (!pts.length) pts = [{latitude: CENTER[0]-0.01, longitude: CENTER[1]-0.01},{latitude: CENTER[0]+0.01, longitude: CENTER[1]+0.01}];
    var minLat=90,maxLat=-90,minLon=180,maxLon=-180;
    pts.forEach(function(p){ minLat=Math.min(minLat,p.latitude); maxLat=Math.max(maxLat,p.latitude); minLon=Math.min(minLon,p.longitude); maxLon=Math.max(maxLon,p.longitude); });
    var pad = Math.max((maxLat-minLat),(maxLon-minLon)) * 0.08 + 0.001;
    var W=1000,H=1000;
    function xy(p){
      return [ (p.longitude-(minLon-pad))/((maxLon-minLon)+2*pad)*W,
               (1-(p.latitude-(minLat-pad))/((maxLat-minLat)+2*pad))*H ];
    }
    svg.setAttribute('viewBox','0 0 '+W+' '+H);
    var out = '<rect width="'+W+'" height="'+H+'" fill="#E9EEF5"/>';
    (CITY_RINGS || []).forEach(function(polygon){
      polygon.forEach(function(r){
        out += '<polyline points="'+r.map(function(p){ return xy(p).join(','); }).join(' ')+'" fill="none" stroke="#1E9E5A" stroke-width="5" stroke-dasharray="12 8" opacity="0.95"/>';
      });
    });
    (s.zones||[]).forEach(function(z){
      var p = z.ring.map(function(q){ return xy(q).join(','); }).join(' ');
      var col = (s.activeZoneId === z.id) ? z.color : '#8794A6';
      out += '<polygon points="'+p+'" fill="'+col+'" fill-opacity="0.14" stroke="'+col+'" stroke-width="4" stroke-dasharray="'+(s.coverageOk?'none':'12 8')+'"/>';
      var c = xy(z.ring[0]);
      out += '<text x="'+(c[0]+10)+'" y="'+(c[1]+34)+'" font-size="28" font-family="sans-serif" fill="'+col+'">'+z.label+'</text>';
    });
    (s.layers||[]).forEach(function(l){
      if (!l.points || !l.points.length) return;
      out += '<polyline points="'+l.points.map(function(q){ return xy(q).join(','); }).join(' ')+'" fill="none" stroke="'+l.color+'" stroke-width="'+(l.width||5)+'" stroke-linecap="round" stroke-linejoin="round"'+(l.dashed?' stroke-dasharray="14 10"':'')+' opacity="'+(l.opacity==null?1:l.opacity)+'"/>';
    });
    var m = s.markers || {};
    if (m.pickup){ var a=xy(m.pickup); out += '<circle cx="'+a[0]+'" cy="'+a[1]+'" r="20" fill="#1E9E5A" stroke="#fff" stroke-width="6"/>'; }
    if (m.destination){ var b=xy(m.destination); out += '<circle cx="'+b[0]+'" cy="'+b[1]+'" r="20" fill="#F2A900" stroke="#fff" stroke-width="6"/>'; }
    (s.terminals||[]).forEach(function(t){ var c=xy(t.coords); out += '<rect x="'+(c[0]-14)+'" y="'+(c[1]-14)+'" width="28" height="28" rx="6" fill="#0E2E63" stroke="#fff" stroke-width="5"/>'; });
    if (m.vehicle){ var v=xy(m.vehicle); out += '<rect x="'+(v[0]-16)+'" y="'+(v[1]-16)+'" width="32" height="32" rx="16" fill="#1F5FBF" stroke="#fff" stroke-width="6"/>'; }
    svg.innerHTML = out;
  }

  // ------------------------------------------------------------------ Leaflet
  function initMap(){
    // Keep the camera static at startup. The slightly wider framing exposes
    // the demo coverage and route context without any post-render focus motion.
    map = L.map('map', { zoomControl:false, attributionControl:false, zoomSnap:0.25, zoomDelta:0.5 }).setView(CENTER, 13);
    // Keep mapped city jurisdiction visible independently of synthetic TODA zones.
    if (CITY_GEOMETRY){
      L.geoJSON(CITY_GEOMETRY, {
        style: { color:'#1E9E5A', weight:3, opacity:0.95, fill:false, dashArray:'8 6' },
        interactive:false
      }).addTo(map);
      // Keep the downtown zoom established by setView(CENTER, 13.5). Fitting the
      // entire municipal boundary makes pickup, destination and route details
      // too small to use; users can still zoom out to inspect the full outline.
    } else if (RINGS.length){
      // If no city dataset is supplied, show the synthetic demonstration area.
      var bounds = null;
      RINGS.forEach(function(r){ r.forEach(function(p){ bounds = bounds ? bounds.extend(p) : L.latLngBounds(p, p); }); });
      if (bounds) map.fitBounds(bounds.pad(0.12), { animate:false });
    }
    tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, crossOrigin: true });
    tiles.on('loading', function(){ post({ type:'tiles', state:'loading' }); });
    tiles.on('load', function(){ post({ type:'tiles', state:'ready' }); });
    tiles.on('tileerror', function(){ if(!tileErrorSent){ tileErrorSent = true; post({ type:'tiles', state:'error' }); } });
    tiles.on('tileload', function(){ tileErrorSent = false; post({ type:'tiles', state:'ready' }); });
    tiles.addTo(map);
    L.control.zoom({ position:'topright' }).addTo(map);
    map.on('click', function(e){ post({ type:'tap', latitude: e.latlng.lat, longitude: e.latlng.lng }); });
  }

  function icon(html, w, h, ax, ay){
    return L.divIcon({ className:'', html: html, iconSize:[w,h], iconAnchor:[ax,ay] });
  }

  function ensureZone(z, s){
    var el = zoneEls[z.id];
    var featured = s.activeZoneId === z.id || (!s.activeZoneId && z.id === 'TODA-A');
    var style = {
      color: featured ? z.color : '#8794A6',
      weight: featured ? 3 : 2,
      opacity: 0.9,
      fillColor: s.coverageOk ? z.color : '#D6453D',
      fillOpacity: featured ? 0.2 : 0.05,
      dashArray: s.coverageOk ? null : '8 6'
    };
    var latlngs = z.ring.map(function(p){ return [p.latitude, p.longitude]; });
    if (!el){
        // Coverage is a visual layer, not a selectable marker. Let taps inside
        // the fill reach the map click handler so they can choose a location.
        el = L.polygon(latlngs, Object.assign({}, style, { interactive:false }));
      el.bindTooltip(z.label, { sticky:true });
      el.addTo(map);
      zoneEls[z.id] = el;
    } else {
      el.setStyle(style);
    }
  }

  function markerHtml(kind, heading, selected){
    var sel = selected ? ' selected' : '';
    if (kind === 'pickup') return '<div class="pin pickup'+(selected?' selected':'')+'"></div>';
    if (kind === 'destination') return '<div class="pin dest'+(selected?' selected':'')+'"></div>';
    if (kind === 'current') return '<div class="gps"></div>';
    if (kind === 'vehicle') return '<div class="veh'+sel+'"><span class="vehArrow" style="transform:rotate('+Math.round(heading||0)+'deg)">&#9650;</span></div>';
    if (kind.indexOf('terminal:') === 0) return '<div class="term'+sel+'">&#9873;</div>';
    return '<div class="pin pickup'+(selected?' selected':'')+'"></div>';
  }

  function ensureMarker(id, coords, kind, heading, selected, interactive){
    var el = markerEls[id];
    var html = markerHtml(kind, heading, selected);
    if (!el){
      var isVehicle = kind === 'vehicle';
      var isTerminal = kind.indexOf('terminal:') === 0;
      var size = isVehicle ? [24, 24] : isTerminal ? [20, 20] : kind === 'current' ? [15, 15] : [22, 22];
      var anchor = isVehicle ? [12, 12] : isTerminal ? [10, 10] : kind === 'current' ? [7, 7] : [11, 22];
      el = L.marker([coords.latitude, coords.longitude], {
        icon: icon(html, size[0], size[1], anchor[0], anchor[1]),
        interactive: interactive !== false,
        bubblingMouseEvents: false,
        keyboard: false,
        zIndexOffset: kind === 'vehicle' ? 600 : kind === 'pickup' || kind === 'destination' ? 500 : 400
      });
      if (interactive !== false){
        el.on('click', function(){ post({ type:'marker', id: id }); });
      }
      el.addTo(map);
      markerEls[id] = el;
    } else {
      var pos = el.getLatLng();
      if (Math.abs(pos.lat - coords.latitude) > 1e-7 || Math.abs(pos.lng - coords.longitude) > 1e-7){
        el.setLatLng([coords.latitude, coords.longitude]);
      }
      var node = el.getElement();
      if (node){
        var inner = node.firstElementChild;
        var want = markerHtml(kind, heading, selected);
        if (inner && inner.outerHTML !== want) node.innerHTML = want;
      }
    }
  }

  function clearMarkersExcept(keep){
    Object.keys(markerEls).forEach(function(id){
      if (keep.indexOf(id) === -1){
        map.removeLayer(markerEls[id]);
        delete markerEls[id];
      }
    });
  }

  function layerSignature(l){
    if (!l.points || !l.points.length) return l.id + '|0';
    var mid = l.points[Math.floor(l.points.length / 2)];
    return [l.id, l.points.length, l.points[0].latitude, l.points[0].longitude,
            mid.latitude, mid.longitude,
            l.points[l.points.length-1].latitude, l.points[l.points.length-1].longitude,
            l.color, l.width || 5, l.dashed ? 1 : 0, l.opacity == null ? 1 : l.opacity].join(',');
  }

  function renderLayers(layers){
    var wanted = {};
    (layers || []).forEach(function(l){
      wanted[l.id] = true;
      if (!l.points || l.points.length < 2){ return; }
      var sig = layerSignature(l);
      if (layerSig[l.id] === sig) return;
      var existing = layerEls[l.id];
      var latlngs = l.points.map(function(p){ return [p.latitude, p.longitude]; });
      var style = { color: l.color, weight: l.width || 5, opacity: l.opacity == null ? 1 : l.opacity,
                    dashArray: l.dashed ? '10 8' : null, lineCap: 'round', lineJoin: 'round' };
      if (existing){
        existing.setStyle(style);
        existing.setLatLngs(latlngs);
      } else {
        layerEls[l.id] = L.polyline(latlngs, style).addTo(map);
      }
      layerSig[l.id] = sig;
    });
    Object.keys(layerEls).forEach(function(id){
      if (!wanted[id]){
        map.removeLayer(layerEls[id]);
        delete layerEls[id];
        delete layerSig[id];
      }
    });
  }

  window.applyState = function(s){
    lastState = Object.assign({}, lastState, s);
    if (typeof L === 'undefined'){ fallbackOn(); renderFallback(lastState); return; }
    if (!map){ try { initMap(); } catch (e) { post({type:'jsError', message:String(e)}); renderFallback(lastState); fallbackOn(); return; } }

    (lastState.zones || []).forEach(function(z){ ensureZone(z, lastState); });

    var keep = [];
    var m = lastState.markers || {};
    if (m.pickup){ keep.push('pickup'); ensureMarker('pickup', m.pickup, 'pickup', 0, lastState.selectedMarker === 'pickup', true); }
    if (m.destination){ keep.push('destination'); ensureMarker('destination', m.destination, 'destination', 0, lastState.selectedMarker === 'destination', true); }
    if (m.vehicle){ keep.push('vehicle'); ensureMarker('vehicle', m.vehicle, 'vehicle', m.vehicleHeading || 0, lastState.selectedMarker === 'vehicle', true); }
    if (m.current){ keep.push('current'); ensureMarker('current', m.current, 'current', 0, false, false); }
    (lastState.terminals || []).forEach(function(t){
      var id = 'terminal:' + t.id;
      keep.push(id);
      ensureMarker(id, t.coords, 'terminal:'+t.id, 0, lastState.selectedMarker === id, true);
    });
    clearMarkersExcept(keep);

    renderLayers(lastState.layers);

    if (lastState.focus && lastState.focus.key !== lastFocusKey){
      lastFocusKey = lastState.focus.key;
      var z = lastState.focus.zoom != null ? lastState.focus.zoom : map.getZoom();
      map.setView([lastState.focus.coords.latitude, lastState.focus.coords.longitude], z, { animate: true, duration: 0.5 });
    }

    if (lastState.follow && lastState.follow.coords){
      if (lastState.follow.key !== lastFollowKey || Date.now() - lastFollowAt > 500){
        lastFollowKey = lastState.follow.key;
        lastFollowAt = Date.now();
        map.panTo([lastState.follow.coords.latitude, lastState.follow.coords.longitude], { animate: true, duration: 0.4, easeLinearity: 0.25 });
      }
    }
  };

  window.addEventListener('online', function(){ post({ type:'net', online:true }); tileErrorSent = false; if (tiles) tiles.redraw(); });
  window.addEventListener('offline', function(){ post({ type:'net', online:false }); });
</script>
<script>
  // Leaflet is missing entirely: draw the synthetic layers as SVG instead so the
  // map area is never empty, and let the UI say tiles are unavailable.
  if (typeof L === 'undefined'){ fallbackOn(); renderFallback(lastState); }
  post({ type: 'ready' });
  post({ type: 'net', online: (typeof navigator === 'undefined' || navigator.onLine !== false) });
</script>
</body></html>`;
}

const styles = StyleSheet.create({
  container: { width: '100%', backgroundColor: colors.backgroundDeep, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: 'transparent' },
  banner: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerError: { backgroundColor: 'rgba(251,231,229,0.96)', borderColor: colors.danger },
  bannerOffline: { backgroundColor: 'rgba(226,244,248,0.96)', borderColor: colors.info },
  bannerText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', flexShrink: 1 },
  bannerOfflineText: { color: colors.info, fontSize: 12, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  attribution: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.82)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderTopRightRadius: radius.sm,
    maxWidth: '70%',
  },
  attributionText: { fontSize: 9, color: colors.textFaint },
});

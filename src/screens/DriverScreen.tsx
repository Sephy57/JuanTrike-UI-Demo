import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEMO_TERMINALS, DEMO_ZONES, zoneFor } from '../booking/demoZones';
import { driverProfileFor } from '../booking/driverProfile';
import { ANGELES_CITY_BOUNDARY, isAngelesCityPoint, isRouteInsideAngelesCity } from '../booking/cityBoundary';
import { ANGELES_CITY_CENTER, formatCoords } from '../booking/geo';
import { activeRouteResult, remainingMetres, remainingSeconds, vehicleHeading, vehiclePosition } from '../booking/movement';
import { buildRouteLayers } from '../booking/routeLayers';
import { useDemoControls, useDemoState } from '../booking/DemoContext';
import { FocusedMarker, MapLegend, MarkerInfoCard, NavPanel, RouteSourceBadge } from '../components/MapOverlays';
import { HistoryList } from '../components/HistoryList';
import { BrandLogo } from '../components/BrandLockup';
import { InteractiveMap, MapFocus, MapMarkers, MarkerId } from '../components/MapView';
import { Avatar, Badge, Button, Card, Divider, IconButton, KeyValue, Muted, ProgressBar, RouteStepper, SectionTitle, Title } from '../components/Ui';
import { useForegroundLocation } from '../location/useForegroundLocation';
import { t } from '../i18n/strings';
import { colors, radius, spacing, typography } from '../theme/tokens';

export function DriverScreen({
  onOpenPanel,
  onSwitchMode,
  onOpenInfo,
}: {
  onOpenPanel: () => void;
  onSwitchMode?: () => void;
  onOpenInfo?: () => void;
}) {
  const { state, dispatch } = useDemoState();
  const { lang, switchMode, driverOnline, setDriverOnline } = useDemoControls();
  const insets = useSafeAreaInsets();
  const gps = useForegroundLocation();
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [follow, setFollow] = useState<{ key: number } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [markerId, setMarkerId] = useState<MarkerId | null>(null);
  const { status, booking, pickup, destination, offer } = state;
  const profileDriver = driverProfileFor(state);
  const profileIdentity = t(lang, 'driverIdentity');

  const vehicle = vehiclePosition(state);
  const vehicleDir = vehicleHeading(state);
  const routeResult = useMemo(() => activeRouteResult(state), [state]);
  const navigationInsideCity = useMemo(
    () => (routeResult ? isRouteInsideAngelesCity(routeResult.points) : true),
    [routeResult],
  );
  const driverCoords = gps.fix?.coords ?? vehicle;
  const driverOutsideCity = driverCoords !== null && !isAngelesCityPoint(driverCoords);
  const layers = useMemo(() => buildRouteLayers(state), [state]);

  const pickupCoords = booking?.pickup.coords ?? pickup?.coords ?? null;
  const destinationCoords = booking?.destination.coords ?? destination?.coords ?? null;
  const pickupZone = pickupCoords ? zoneFor(pickupCoords) : null;
  const destinationZone = destinationCoords ? zoneFor(destinationCoords) : null;

  const markers: MapMarkers = useMemo(
    () => ({
      pickup: pickupCoords,
      destination: destinationCoords,
      current: gps.fix?.coords ?? null,
      vehicle,
      vehicleHeading: vehicleDir,
    }),
    [pickupCoords, destinationCoords, gps.fix, vehicle, vehicleDir],
  );

  const focusedMarker: FocusedMarker = useMemo(() => {
    if (!markerId) return null;
    if (markerId === 'pickup' && pickupCoords) {
      return { kind: 'pickup', coords: pickupCoords, inside: pickupZone !== null, zoneLabel: pickupZone?.label ?? null };
    }
    if (markerId === 'destination' && destinationCoords) {
      return { kind: 'destination', coords: destinationCoords, inside: destinationZone !== null, zoneLabel: destinationZone?.label ?? null };
    }
    if (markerId.startsWith('terminal:')) {
      const term = DEMO_TERMINALS.find((x) => `terminal:${x.id}` === markerId);
      if (!term) return null;
      const zone = zoneFor(term.coords);
      return { kind: 'terminal', label: term.label, coords: term.coords, zoneLabel: zone?.label ?? null };
    }
    return null;
  }, [markerId, pickupCoords, destinationCoords, pickupZone, destinationZone]);

  const onMarkerTap = useCallback((id: MarkerId) => setMarkerId(id), []);

  const recenter = async () => {
    setFollow(null);
    const result = await gps.refresh();
    if (result) setFocus({ coords: result.coords, key: Date.now() });
  };

  const toggleFollow = () => {
    if (follow) {
      setFollow(null);
      return;
    }
    if (!vehicle) return;
    setMarkerId(null);
    setFollow({ key: Date.now() });
  };

  const followEnabled = follow !== null && vehicle !== null;
  const followPayload = followEnabled && vehicle ? { coords: vehicle, key: follow!.key } : null;

  const incoming = status === 'DRIVER_OFFERED' && Boolean(booking && offer);
  const activeTrip = status === 'DRIVER_ACCEPTED' || status === 'DRIVER_ARRIVING' || status === 'DRIVER_ARRIVED' || status === 'TRIP_STARTED';
  const showNav = Boolean(routeResult) && status !== 'IDLE' && status !== 'LOCATIONS_SELECTED' && !incoming && !activeTrip && status !== 'TRIP_COMPLETED' && status !== 'TRIP_CANCELLED';
  const today = new Date().toDateString();
  const completedToday = state.history.filter((record) => record.outcome === 'COMPLETED' && new Date(record.endedAt).toDateString() === today);
  const earningsToday = completedToday.reduce((total, record) => total + record.fareDemo, 0);

  const routeMap = (
    <View style={[styles.routeMap, incoming && styles.offerRouteMap, activeTrip && styles.activeRouteMap]} testID="driver-route-preview">
      <InteractiveMap
        center={ANGELES_CITY_CENTER}
        markers={markers}
        focus={focus}
        follow={followPayload}
        onMarkerTap={onMarkerTap}
        zones={DEMO_ZONES}
        cityBoundary={ANGELES_CITY_BOUNDARY.geometry}
        terminals={DEMO_TERMINALS}
        activeZoneId={pickupZone?.id ?? null}
        layers={layers}
        selectedMarker={markerId}
        loadingLabel={t(lang, 'mapLoading')}
        errorLabel={t(lang, 'mapError')}
        offlineLabel={t(lang, 'offlineMap')}
        attribution={t(lang, 'mapAttribution')}
      />
      <View style={styles.routeMapTools} pointerEvents="box-none">
        <MapLegend lang={lang} open={legendOpen} onToggle={() => setLegendOpen((v) => !v)} compact={incoming || activeTrip} />
        <IconButton glyph="◎" label={followEnabled ? t(lang, 'stopFollowing') : t(lang, 'followVehicle')} onPress={toggleFollow} tone={followEnabled ? 'primary' : 'surface'} size={44} />
        <IconButton glyph="⌖" label={t(lang, 'recenter')} onPress={recenter} tone="surface" size={44} />
      </View>
      <View style={styles.routeMapBadge} pointerEvents="none">
        {routeResult ? <RouteSourceBadge lang={lang} source={routeResult.source} /> : null}
        {driverOutsideCity || !navigationInsideCity ? <Badge label={driverOutsideCity ? t(lang, 'cityBoundaryOutside') : t(lang, 'routeOutsideCity')} tone="danger" /> : null}
        {gps.fix ? <Text style={styles.gpsChipText}>{gps.fix.simulated ? t(lang, 'gpsEmulator') : t(lang, 'gpsDevice')} · {formatCoords(gps.fix.coords)}</Text> : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <BrandLogo width={92} height={70} />
        </View>
        <View style={styles.headerActions}>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: driverOnline }} accessibilityLabel={driverOnline ? t(lang, 'online') : t(lang, 'offline')} onPress={() => setDriverOnline(!driverOnline)} style={[styles.onlineToggle, !driverOnline && styles.onlineToggleOff]}>
            <Text style={[styles.onlineToggleText, !driverOnline && styles.onlineToggleTextOff]}>{driverOnline ? '●' : '○'} {driverOnline ? t(lang, 'onlineShort') : t(lang, 'offlineShort')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'demoPanel')} onPress={onOpenPanel} style={styles.modeButton}>
            <Text style={styles.modeButtonText}>⚙</Text>
          </Pressable>
          {onOpenInfo ? <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'aboutApp')} onPress={onOpenInfo} style={styles.modeButton}><Text style={styles.modeButtonText}>i</Text></Pressable> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'passengerMode')} onPress={onSwitchMode ?? (() => switchMode('driver', 'passenger'))} style={styles.modeButton}>
            <Text style={styles.modeButtonText}>⇄</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.statsRow} testID="driver-summary-stats">
        <View style={[styles.statTile, styles.statTilePrimary]}><Text style={styles.statValuePrimary}>{completedToday.length}</Text><Text style={styles.statLabelPrimary}>{t(lang, 'todayRides')}</Text></View>
        <View style={styles.statTile}><Text style={styles.statValue}>₱{earningsToday}</Text><Text style={styles.statLabel}>{t(lang, 'demoEarnings')}</Text></View>
        <View style={styles.statTile} testID="driver-rating-stat" accessibilityLabel={`Demo rating ${profileDriver.demoRating.toFixed(1)}`}>
          <Text style={styles.statValue}><Text style={styles.statRatingStar}>★</Text> {profileDriver.demoRating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>{t(lang, 'rating')}</Text>
        </View>
      </View>

      <ScrollView
        testID="driver-sheet-scroll"
        style={styles.sheet}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        {markerId ? <MarkerInfoCard lang={lang} marker={focusedMarker} onDismiss={() => setMarkerId(null)} /> : null}

        {/* The incoming offer sits at the top so it is visible without scrolling. */}
        {incoming && booking && offer ? (
          <Card style={styles.incoming} testID="driver-incoming-offer">
            <View style={styles.offerHeading}>
              <Badge label={`● ${t(lang, 'incomingBooking')}`} tone="accent" style={styles.offerBadge} />
              <Text style={styles.countdown}>{Math.ceil(offer.secondsLeft)}{t(lang, 'secondsUnit')}</Text>
            </View>
            <View style={styles.driverRow}>
              <Avatar name={booking.passengerName} size={36} />
              <View style={styles.flex}>
                <Text style={styles.driverName}>{booking.passengerName}</Text>
                <Muted>{t(lang, 'passengerRequester')}</Muted>
              </View>
            </View>
            <Divider />
            <KeyValue label={t(lang, 'pickup')} value={booking.pickup.label} />
            <KeyValue label={t(lang, 'destination')} value={booking.destination.label} />
            {routeMap}
            <View style={styles.offerMetrics} accessibilityLabel={`${t(lang, 'distanceEstimate')}: ${booking.distanceKm.toFixed(2)} km · ${t(lang, 'demoFare')}: ₱${booking.fareDemo}`}>
              <Text style={styles.offerMetricValue}>{booking.distanceKm.toFixed(2)} km</Text>
              <Text style={styles.offerMetricValue}>{t(lang, 'demoFare')} · ₱{booking.fareDemo}</Text>
            </View>
            <Muted style={styles.offerDisclosure}>{t(lang, 'fareOnlyDemo')}</Muted>
          </Card>
        ) : null}

        {showNav ? <NavPanel lang={lang} state={state} route={routeResult} /> : null}

        {activeTrip ? (
          <Card style={styles.activeCard} testID="driver-active-trip">
            <View style={styles.tripStatusHeader} testID="driver-trip-status">
              <Text style={styles.tripStatusTitle}>{status === 'DRIVER_ACCEPTED' || status === 'DRIVER_ARRIVING'
                ? t(lang, 'driverEnRoute')
                : status === 'DRIVER_ARRIVED'
                  ? t(lang, 'driverArrived')
                  : t(lang, 'tripStarted')}</Text>
              <Text style={styles.tripStatusMeta}>{status === 'TRIP_STARTED' ? `${remainingSeconds(state) ?? 0}${t(lang, 'secondsUnit')}` : t(lang, 'simulated')}</Text>
            </View>
            <View testID="driver-trip-progress-steps">
              <RouteStepper steps={[{ label: t(lang, 'stagePickedUp'), tone: colors.success }, { label: t(lang, 'stageTrip'), tone: colors.success }, { label: t(lang, 'stageArriving'), tone: colors.success }]} activeIndex={status === 'TRIP_STARTED' ? 1 : status === 'DRIVER_ARRIVED' ? 0 : 0} />
              {status === 'DRIVER_ARRIVING' ? <ProgressBar value={state.progress} label={t(lang, 'approachProgress')} tone={colors.accent} /> : null}
              {status === 'TRIP_STARTED' ? <ProgressBar value={state.progress} label={t(lang, 'tripProgress')} /> : null}
            </View>
            {routeMap}
            <View style={styles.tripMetrics} testID="driver-trip-metrics">
              <View style={styles.tripMetricTile}>
                <Muted>{t(lang, 'etaSimulated')}</Muted>
                <Text style={styles.tripMetricValue}>~{remainingSeconds(state) ?? 0}{t(lang, 'secondsUnit')}</Text>
              </View>
              <View style={styles.tripMetricTile}>
                <Muted>{t(lang, 'remainingSimulated')}</Muted>
                <Text style={styles.tripMetricValue}>{remainingMetres(state) ?? 0} m</Text>
              </View>
            </View>
            {booking && state.driver ? <View style={styles.tripIdentity} testID="driver-trip-identity"><Avatar name={state.driver.name} size={42} /><View style={styles.flex}><Text style={styles.driverName}>{state.driver.name}</Text><Muted>{state.driver.todaId} · {t(lang, 'bodyNumber')} {state.driver.bodyNumber}</Muted></View></View> : null}
          </Card>
        ) : null}

        {status === 'TRIP_COMPLETED' || status === 'TRIP_CANCELLED' ? (
          <Card style={styles.activeCard}>
            <View style={[styles.tripStatusHeader, status === 'TRIP_CANCELLED' && styles.tripStatusHeaderCancelled]}><Text style={styles.tripStatusTitle}>{status === 'TRIP_COMPLETED' ? t(lang, 'tripCompleted') : t(lang, 'tripCancelled')}</Text><Text style={styles.tripStatusMeta}>{t(lang, 'simulated')}</Text></View>
            {status === 'TRIP_COMPLETED' && booking ? (
              <>
                {routeMap}
                <RouteStepper steps={[{ label: t(lang, 'stagePickedUp'), tone: colors.success }, { label: t(lang, 'stageTrip'), tone: colors.success }, { label: t(lang, 'stageArriving'), tone: colors.success }]} activeIndex={2} />
                <Muted>{`${t(lang, 'demoFare')}: ₱${booking.fareDemo} · ${t(lang, 'paymentCollected')}`}</Muted>
              </>
            ) : null}
          </Card>
        ) : null}

        {!activeTrip && !incoming && status !== 'TRIP_COMPLETED' && status !== 'TRIP_CANCELLED' ? (
          <Card>
            <View style={styles.idleMapHeader}><View><Title style={styles.queueTitle}>{t(lang, 'driverDashboard')}</Title><Muted>{t(lang, 'noActiveTripTitle')}</Muted></View><Button label={t(lang, 'demoPanel')} variant="ghost" compact onPress={onOpenPanel} /></View>
            {routeMap}
            <Muted>{t(lang, 'noActiveTripBody')}</Muted>
          </Card>
        ) : null}

        {!incoming ? <Card style={styles.profileCard}>
          <SectionTitle>{t(lang, 'driverProfile')}</SectionTitle>
          <View style={styles.driverRow}>
            <Avatar name={profileDriver.name} size={40} />
            <View style={styles.flex}>
              <Text style={styles.driverName}>{profileDriver.name}</Text>
              <Muted>{profileIdentity}</Muted>
            </View>
          </View>
          <KeyValue label={t(lang, 'shiftStatus')} value={driverOnline ? t(lang, 'onShift') : t(lang, 'offShift')} />
          <View style={styles.actionRow}>
            <Button
              label={driverOnline ? t(lang, 'offline') : t(lang, 'goOnline')}
              variant={driverOnline ? 'ghost' : 'success'}
              onPress={() => setDriverOnline(!driverOnline)}
              style={styles.flex}
            />
          </View>
        </Card> : null}

        <Card style={styles.queueCard} testID="driver-fifo-queue">
          <View style={styles.queueHeading}>
            <View><SectionTitle>{t(lang, 'queueHeading')}</SectionTitle><Title style={styles.queueTitle}>{t(lang, 'queueTitle')}</Title></View>
            <Button label={showHistory ? t(lang, 'close') : t(lang, 'history')} variant="ghost" compact onPress={() => setShowHistory((v) => !v)} />
          </View>
          {showHistory ? <View style={styles.historyBox}><HistoryList records={state.history} /></View> : null}
          <View style={styles.queueEmpty}>
            <Muted>{t(lang, 'noQueueRequests')}</Muted>
          </View>
        </Card>

        {status === 'SEARCHING_DRIVER' && !driverOnline ? (
          <Card>
            <Muted>{t(lang, 'offline')}</Muted>
          </Card>
        ) : null}

      </ScrollView>
      {incoming && booking && offer ? (
        <View testID="driver-sticky-actions" style={[styles.stickyActions, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <Button label={t(lang, 'decline')} variant="danger" onPress={() => dispatch({ type: 'DECLINE_BOOKING' })} style={styles.flex} />
          <Button label={t(lang, 'accept')} variant="success" onPress={() => dispatch({ type: 'ACCEPT_BOOKING', driverName: offer.driver.name })} style={styles.flex} testID="accept-booking" />
        </View>
      ) : null}
      {status === 'DRIVER_ACCEPTED' ? (
        <View testID="driver-sticky-single" style={[styles.stickySingle, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <Button label={t(lang, 'onTheWay')} onPress={() => dispatch({ type: 'DRIVER_EN_ROUTE' })} testID="driver-primary-action" />
        </View>
      ) : null}
      {status === 'DRIVER_ARRIVING' ? (
        <View testID="driver-sticky-single" style={[styles.stickySingle, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <Button label={t(lang, 'arrivedAtPickup')} onPress={() => dispatch({ type: 'DRIVER_ARRIVED' })} testID="driver-primary-action" />
        </View>
      ) : null}
      {status === 'DRIVER_ARRIVED' ? (
        <View testID="driver-sticky-single" style={[styles.stickySingle, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <Button label={t(lang, 'startTrip')} variant="success" onPress={() => dispatch({ type: 'START_TRIP' })} testID="driver-primary-action" />
        </View>
      ) : null}
      {status === 'TRIP_STARTED' ? (
        <View testID="driver-sticky-single" style={[styles.stickySingle, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <Button label={t(lang, 'completeTrip')} variant="success" onPress={() => dispatch({ type: 'COMPLETE_TRIP', now: Date.now() })} testID="complete-trip" />
        </View>
      ) : null}
      {status === 'TRIP_COMPLETED' || status === 'TRIP_CANCELLED' ? (
        <View testID="driver-sticky-single" style={[styles.stickySingle, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <Button label={t(lang, 'returnToQueue')} onPress={() => dispatch({ type: 'NEW_BOOKING' })} testID="driver-primary-action" />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 74,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineToggle: { minHeight: 38, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  onlineToggleOff: { backgroundColor: colors.backgroundDeep },
  onlineToggleText: { color: colors.onPrimary, fontSize: 11, fontWeight: '800' },
  onlineToggleTextOff: { color: colors.textMuted },
  modeButton: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  modeButtonText: { color: colors.primaryDark, fontSize: 18, fontWeight: '800' },
  brand: { ...typography.heading, color: colors.primary },
  statsRow: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  statTile: { flex: 1, minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  statTilePrimary: { backgroundColor: colors.success, borderColor: colors.success },
  statValue: { color: colors.text, fontSize: 15, fontWeight: '900' },
  statRatingStar: { color: colors.accent },
  statLabel: { color: colors.textMuted, fontSize: 9, textAlign: 'center' },
  statValuePrimary: { color: colors.onPrimary, fontSize: 16, fontWeight: '900' },
  statLabelPrimary: { color: colors.onPrimary, fontSize: 9, textAlign: 'center' },
  sheet: { flex: 1, minHeight: 0, backgroundColor: colors.background },
  sheetContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm },
  stickyActions: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  stickySingle: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  queueCard: { gap: spacing.sm },
  queueHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  queueTitle: { fontSize: 15 },
  queueEmpty: { backgroundColor: colors.primaryTint, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  incoming: { gap: spacing.xs, padding: spacing.sm },
  offerBadge: { backgroundColor: colors.accent },
  offerMetrics: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  offerDisclosure: { fontSize: 10, textAlign: 'right', marginTop: -spacing.xs },
  offerMetric: { flex: 1, gap: 2 },
  offerMetricValue: { color: colors.text, fontSize: 14, fontWeight: '800' },
  offerHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  countdown: { backgroundColor: colors.backgroundDeep, color: colors.text, fontSize: 12, fontWeight: '800', borderRadius: radius.pill, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 6 },
  routeMap: { height: 158, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.backgroundDeep, borderWidth: 1, borderColor: colors.border, position: 'relative' },
  offerRouteMap: { height: 132 },
  activeRouteMap: { height: 184 },
  routeMapTools: { position: 'absolute', right: 6, top: 6, bottom: 6, justifyContent: 'space-between', alignItems: 'flex-end' },
  routeMapBadge: { position: 'absolute', left: 6, top: 6, right: 58, gap: 4, alignItems: 'flex-start' },
  gpsChipText: { backgroundColor: 'rgba(255,255,255,0.92)', color: colors.textMuted, fontSize: 9, paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.sm },
  tripIdentity: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tripMetrics: { flexDirection: 'row', gap: spacing.sm },
  tripMetricTile: { flex: 1, minHeight: 54, justifyContent: 'center', gap: 2, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  tripMetricValue: { color: colors.text, fontSize: 14, fontWeight: '800' },
  idleMapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  driverName: { fontSize: 15, fontWeight: '800', color: colors.text },
  activeCard: { gap: spacing.sm },
  tripStatusHeader: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, backgroundColor: colors.success, borderRadius: radius.md, paddingHorizontal: spacing.md },
  tripStatusHeaderCancelled: { backgroundColor: colors.danger },
  tripStatusTitle: { color: colors.onPrimary, fontSize: 15, fontWeight: '800', flexShrink: 1 },
  tripStatusMeta: { color: colors.onPrimary, fontSize: 11, fontWeight: '700' },
  profileCard: { gap: spacing.sm },
  historyBox: { minHeight: 160, maxHeight: 280 },
});

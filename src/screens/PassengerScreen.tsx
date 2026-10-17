import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { isSearching, Place } from '../booking/bookingMachine';
import { DEMO_POLICY, DEMO_TERMINALS, DEMO_ZONES, zoneFor } from '../booking/demoZones';
import { ANGELES_CITY_BOUNDARY, isAngelesCityPoint, isRouteInsideAngelesCity } from '../booking/cityBoundary';
import { ANGELES_CITY_CENTER, demoFareFor, formatCoords, haversineKm } from '../booking/geo';
import { activeRouteResult, remainingMetres, remainingSeconds, vehicleHeading, vehiclePosition } from '../booking/movement';
import { buildRouteLayers } from '../booking/routeLayers';
import { useDemoControls, useDemoState } from '../booking/DemoContext';
import { FocusedMarker, MapLegend, MarkerInfoCard, NavPanel, RouteSourceBadge } from '../components/MapOverlays';
import { HistoryList } from '../components/HistoryList';
import { BrandLogo, BrandMark } from '../components/BrandLockup';
import { InteractiveMap, MapFocus, MapMarkers, MarkerId } from '../components/MapView';
import { Avatar, Badge, Button, Card, IconButton, Muted, ProgressBar, RouteStepper, Title } from '../components/Ui';
import { useForegroundLocation } from '../location/useForegroundLocation';
import { t } from '../i18n/strings';
import { colors, radius, spacing } from '../theme/tokens';

type Selecting = 'pickup' | 'destination';

export function PassengerScreen({
  onOpenPanel,
  onSwitchMode,
  onOpenInfo,
}: {
  onOpenPanel: () => void;
  onSwitchMode?: () => void;
  onOpenInfo?: () => void;
}) {
  const { state, dispatch } = useDemoState();
  const { lang, switchMode, confirmBooking } = useDemoControls();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const gps = useForegroundLocation();
  const [selecting, setSelecting] = useState<Selecting>('pickup');
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [follow, setFollow] = useState<{ coords: { latitude: number; longitude: number }; key: number } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [markerId, setMarkerId] = useState<MarkerId | null>(null);

  const editable = state.status === 'IDLE' || state.status === 'LOCATIONS_SELECTED';
  // The booking has finished (completed or cancelled) but the map stays locked until New booking.
  const bookingEnded = state.status === 'TRIP_COMPLETED' || state.status === 'TRIP_CANCELLED';
  const fix = gps.fix;

  const pickupCoords = state.pickup?.coords ?? null;
  const destinationCoords = state.destination?.coords ?? null;
  const pickupZone = pickupCoords ? zoneFor(pickupCoords) : null;
  const destinationZone = destinationCoords ? zoneFor(destinationCoords) : null;
  const pickupInsideCity = pickupCoords !== null && isAngelesCityPoint(pickupCoords);
  const destinationInsideCity = destinationCoords !== null && isAngelesCityPoint(destinationCoords);
  const outsideSyntheticCoverage = (pickupCoords !== null && pickupZone === null) || (destinationCoords !== null && destinationZone === null);

  const vehicle = vehiclePosition(state);
  const vehicleDir = vehicleHeading(state);
  const routeResult = useMemo(() => activeRouteResult(state), [state]);
  const routeInsideCity = useMemo(
    () => (routeResult ? isRouteInsideAngelesCity(routeResult.points) : true),
    [routeResult],
  );
  const outsideCityBoundary =
    (pickupCoords !== null && !pickupInsideCity) ||
    (destinationCoords !== null && !destinationInsideCity);
  const routeOutsideCity = pickupCoords !== null && destinationCoords !== null && !routeInsideCity;
  const blockedByCoverage = outsideSyntheticCoverage || outsideCityBoundary || routeOutsideCity;
  const layers = useMemo(() => buildRouteLayers(state), [state]);

  const markers: MapMarkers = useMemo(
    () => ({
      pickup: pickupCoords,
      destination: destinationCoords,
      current: fix?.coords ?? null,
      vehicle,
      vehicleHeading: vehicleDir,
    }),
    [pickupCoords, destinationCoords, fix, vehicle, vehicleDir],
  );

  const onMapTap = useCallback(
    (coords: { latitude: number; longitude: number }) => {
      if (!editable) return;
      setMarkerId(null);
      const place: Place = { label: formatCoords(coords), coords, source: 'map-tap' };
      dispatch(selecting === 'pickup' ? { type: 'SET_PICKUP', place } : { type: 'SET_DESTINATION', place });
      if (selecting === 'pickup' && !state.destination) setSelecting('destination');
    },
    [editable, selecting, state.destination, dispatch],
  );

  const swapLocations = useCallback(() => {
    if (!editable || !state.pickup || !state.destination) return;
    dispatch({ type: 'SET_PICKUP', place: state.destination });
    dispatch({ type: 'SET_DESTINATION', place: state.pickup });
    setSelecting('pickup');
  }, [editable, state.pickup, state.destination, dispatch]);

  const onMarkerTap = useCallback((id: MarkerId) => setMarkerId(id), []);

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

  const useCurrentForPickup = async () => {
    const result = await gps.refresh();
    if (!result) return;
    const place: Place = {
      label: [
        result.source === 'last-known' ? t(lang, 'gpsLastKnown') : null,
        result.simulated ? t(lang, 'gpsEmulator') : t(lang, 'gpsDevice'),
      ]
        .filter(Boolean)
        .join(' · '),
      coords: result.coords,
      source: 'gps',
    };
    dispatch({ type: 'SET_PICKUP', place });
    setFocus({ coords: result.coords, key: Date.now() });
  };

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
    const target = vehicle ?? fix?.coords ?? null;
    if (!target) return;
    setMarkerId(null);
    setFollow({ coords: target, key: Date.now() });
  };

  // Follow is an explicit toggle; the key changes only when the user turns it on, so the
  // map page can throttle the camera itself instead of being pushed a new target every tick.
  const followEnabled = follow !== null && vehicle !== null;
  const followPayload = followEnabled && vehicle ? { coords: vehicle, key: follow!.key } : null;

  const status = state.status;
  const { booking } = state;
  const showNav = Boolean(routeResult) && status !== 'IDLE' && status !== 'LOCATIONS_SELECTED';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => setHistoryOpen(true)} accessibilityRole="button" accessibilityLabel={t(lang, 'history')} style={styles.iconBtn}>
          <Text style={styles.iconText}>☰</Text>
        </Pressable>
        <View testID="passenger-brand-lockup" pointerEvents="none" style={styles.centerBrand}>
          <BrandLogo width={126} height={88} />
        </View>
        <View style={styles.headerActions}>
          {onOpenInfo ? <Pressable onPress={onOpenInfo} accessibilityRole="button" accessibilityLabel={t(lang, 'aboutApp')} style={styles.iconBtn}><Text style={styles.iconText}>i</Text></Pressable> : null}
          <Pressable onPress={onSwitchMode ?? (() => switchMode('passenger', 'driver'))} accessibilityRole="button" accessibilityLabel={t(lang, 'driverMode')} style={styles.iconBtn}>
            <Text style={styles.iconText}>♙</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.mapWrap, { height: Math.min(480, Math.max(350, windowHeight * 0.53)) }]}>
        <InteractiveMap
          center={ANGELES_CITY_CENTER}
          markers={markers}
          focus={focus}
          follow={followPayload}
          onTapCoords={onMapTap}
          onMarkerTap={onMarkerTap}
          zones={DEMO_ZONES}
          cityBoundary={ANGELES_CITY_BOUNDARY.geometry}
          terminals={DEMO_TERMINALS}
          activeZoneId={pickupZone?.id ?? destinationZone?.id ?? null}
          coverageOk={!blockedByCoverage}
          layers={layers}
          selectedMarker={markerId}
          loadingLabel={t(lang, 'mapLoading')}
          errorLabel={t(lang, 'mapError')}
          offlineLabel={t(lang, 'offlineMap')}
          attribution={t(lang, 'mapAttribution')}
        />
        <View testID="passenger-location-overlay" pointerEvents="box-none" style={styles.locationFloat}>
          <View style={styles.locationFloatHeader} pointerEvents="none">
            <Text style={styles.serviceAreaTag}>● {t(lang, 'coverageTitle')}</Text>
          </View>
          <LocationRow testID="passenger-pickup-location" label={t(lang, 'pickup')} selectionHint={t(lang, 'tapToSetPickup')} place={state.pickup} zone={pickupZone} insideCity={pickupInsideCity} active={selecting === 'pickup' && editable} onPress={editable ? () => setSelecting('pickup') : undefined} tone={colors.success} lang={lang} compact />
          <View style={styles.locationSwapRow}>
            <View style={styles.divider} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(lang, 'swapLocations')}
              accessibilityState={{ disabled: !editable || !state.pickup || !state.destination }}
              disabled={!editable || !state.pickup || !state.destination}
              onPress={swapLocations}
              style={styles.swapButton}
            >
              <Text style={styles.swapGlyph}>⇅</Text>
            </Pressable>
          </View>
          <LocationRow testID="passenger-destination-location" label={t(lang, 'destination')} selectionHint={t(lang, 'tapToSetDestination')} place={state.destination} zone={destinationZone} insideCity={destinationInsideCity} active={selecting === 'destination' && editable} onPress={editable ? () => setSelecting('destination') : undefined} tone={colors.danger} lang={lang} compact />
          <View style={styles.locationFloatActions}>
            <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'useCurrentLocation')} disabled={!editable || gps.status === 'loading'} onPress={useCurrentForPickup} style={styles.locationAction}>
              <Text style={[styles.locationActionText, (!editable || gps.status === 'loading') && styles.locationActionDisabled]}>{gps.status === 'loading' ? t(lang, 'gpsLoading') : t(lang, 'useCurrentLocation')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'clearLocations')} disabled={!editable || (!state.pickup && !state.destination)} onPress={() => dispatch({ type: 'CLEAR_LOCATIONS' })} style={styles.locationAction}>
              <Text style={[styles.locationActionText, (!editable || (!state.pickup && !state.destination)) && styles.locationActionDisabled]}>{t(lang, 'clearLocations')}</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.floatingRight} pointerEvents="box-none">
          <MapLegend lang={lang} open={legendOpen} onToggle={() => setLegendOpen((v) => !v)} />
          <IconButton
            glyph="◎"
            label={followEnabled ? t(lang, 'stopFollowing') : t(lang, 'followVehicle')}
            onPress={toggleFollow}
            tone={followEnabled ? 'primary' : 'surface'}
          />
          <IconButton glyph="⌖" label={t(lang, 'recenter')} onPress={recenter} tone="surface" />
          <IconButton glyph="⚙" label={t(lang, 'demoPanel')} onPress={onOpenPanel} tone="accent" />
        </View>
        {gp(gps.status, lang) !== null && (
          <View style={styles.gpsNotice} pointerEvents="none">
            <Text style={styles.gpsNoticeText}>{gp(gps.status, lang)}</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + spacing.md }]}
        keyboardShouldPersistTaps="handled"
      >
        {markerId ? <MarkerInfoCard lang={lang} marker={focusedMarker} onDismiss={() => setMarkerId(null)} /> : null}
        <RideSummary state={state} lang={lang} routeSource={routeResult?.source ?? null} routeDistanceKm={routeResult?.distanceKm ?? null} />

        {blockedByCoverage && editable ? (
          <Card style={styles.warningCard}>
            <Badge
              label={outsideCityBoundary ? t(lang, 'cityBoundaryOutside') : routeOutsideCity ? t(lang, 'routeOutsideCity') : t(lang, 'coverageOutside')}
              tone="danger"
            />
            <Muted>
              {outsideCityBoundary
                ? t(lang, 'cityBoundaryWarning')
                : routeOutsideCity
                  ? t(lang, 'routeOutsideCityWarning')
                  : t(lang, 'coverageWarning')}
            </Muted>
          </Card>
        ) : null}

        {status === 'LOCATIONS_SELECTED' && booking === null ? <ReviewPanel routeSource={routeResult?.source ?? null} /> : null}

        {showNav ? <NavPanel lang={lang} state={state} route={routeResult} /> : null}

        {status === 'SEARCHING_DRIVER' && booking ? (
          <Card style={styles.statusCard}>
            <View style={styles.statusRow}>
              <ActivityIndicator color={colors.primary} />
              <View style={styles.flex}>
                <Title style={styles.statusTitle}>{t(lang, 'searching')}</Title>
                <Muted>{t(lang, 'searchingHint')}</Muted>
              </View>
            </View>
            {state.attempts > 0 ? (
              <Muted>{`${t(lang, 'offerLabel')} ${state.attempts} ${t(lang, 'ofWord')} ${DEMO_POLICY.MAX_OFFER_ATTEMPTS}`}</Muted>
            ) : null}
            {state.lastOfferOutcome ? (
              <Muted>{t(lang, state.lastOfferOutcome === 'DECLINED' ? 'declinedNotice' : 'expiredNotice')}</Muted>
            ) : null}
            <Button label={t(lang, 'cancelBooking')} variant="danger" onPress={() => dispatch({ type: 'CANCEL_BOOKING', now: Date.now() })} />
          </Card>
        ) : null}

        {isSearching(status) && status !== 'SEARCHING_DRIVER' ? (
          <Card style={styles.statusCard}>
            <View style={styles.statusRow}>
              <ActivityIndicator color={colors.primary} />
              <View style={styles.flex}>
                <Title style={styles.statusTitle}>{t(lang, 'searching')}</Title>
                <Muted>{t(lang, 'searchingHint')}</Muted>
              </View>
            </View>
            <Button label={t(lang, 'cancelBooking')} variant="danger" onPress={() => dispatch({ type: 'CANCEL_BOOKING', now: Date.now() })} />
          </Card>
        ) : null}

        {status === 'DRIVER_OFFERED' && state.offer ? (
          <Card style={styles.statusCard}>
            <Badge label={t(lang, 'simulated')} tone="accent" />
            <Title style={styles.statusTitle}>{t(lang, 'searching')}</Title>
            <Muted>{`${t(lang, 'offerLabel')} ${state.offer.attempt} ${t(lang, 'ofWord')} ${DEMO_POLICY.MAX_OFFER_ATTEMPTS} · ${t(lang, 'offerExpiresIn')} ${Math.ceil(state.offer.secondsLeft)}${t(lang, 'secondsUnit')}`}</Muted>
            <Button label={t(lang, 'cancelBooking')} variant="danger" onPress={() => dispatch({ type: 'CANCEL_BOOKING', now: Date.now() })} />
          </Card>
        ) : null}

        {(status === 'DRIVER_ACCEPTED' || status === 'DRIVER_ARRIVING' || status === 'DRIVER_ARRIVED' || status === 'TRIP_STARTED') && booking ? (
          <Card style={styles.statusCard}>
            <View style={styles.tripStatusHeader}>
              <Text style={styles.tripStatusTitle}>{status === 'TRIP_STARTED'
                ? t(lang, 'tripStarted')
                : status === 'DRIVER_ARRIVED'
                  ? t(lang, 'driverArrived')
                  : status === 'DRIVER_ARRIVING'
                    ? t(lang, 'driverEnRoute')
                    : t(lang, 'driverAssigned')}</Text>
              <Text style={styles.tripStatusMeta}>{status === 'TRIP_STARTED' ? `${remainingSeconds(state) ?? 0}${t(lang, 'secondsUnit')}` : t(lang, 'simulated')}</Text>
            </View>
            {state.driver ? <View style={styles.tripIdentity}><Avatar name={state.driver.name} size={42} /><View style={styles.flex}><Text style={styles.driverName}>{state.driver.name}</Text><Muted>{state.driver.todaId} · {t(lang, 'bodyNumber')} {state.driver.bodyNumber}</Muted></View></View> : null}
            {status === 'DRIVER_ARRIVED' || status === 'TRIP_STARTED' ? (
              <RouteStepper steps={[{ label: t(lang, 'stagePickedUp'), tone: colors.success }, { label: t(lang, 'stageTrip'), tone: colors.success }, { label: t(lang, 'stageArriving'), tone: colors.success }]} activeIndex={status === 'TRIP_STARTED' ? 1 : 0} />
            ) : null}
            {status === 'DRIVER_ARRIVING' ? (
              <Muted>{`${t(lang, 'etaSimulated')}: ~${remainingSeconds(state) ?? 0}${t(lang, 'secondsUnit')} · ${t(lang, 'remainingSimulated')}: ${remainingMetres(state) ?? 0} m`}</Muted>
            ) : null}
            {status === 'DRIVER_ARRIVING' ? <ProgressBar value={state.progress} label={t(lang, 'approachProgress')} /> : null}
            {status === 'TRIP_STARTED' ? (
              <Muted>{`${t(lang, 'remainingSimulated')}: ${remainingMetres(state) ?? 0} m`}</Muted>
            ) : null}
            {status === 'TRIP_STARTED' ? <ProgressBar value={state.progress} label={t(lang, 'tripProgress')} /> : null}
            {status !== 'TRIP_STARTED' ? (
              <Button label={t(lang, 'cancelBooking')} variant="danger" onPress={() => dispatch({ type: 'CANCEL_BOOKING', now: Date.now() })} />
            ) : null}
          </Card>
        ) : null}

        {status === 'TRIP_COMPLETED' || status === 'TRIP_CANCELLED' ? (
          <Card style={styles.statusCard}>
            <View style={[styles.tripStatusHeader, status === 'TRIP_CANCELLED' && styles.tripStatusHeaderCancelled]}><Text style={styles.tripStatusTitle}>{status === 'TRIP_COMPLETED' ? t(lang, 'tripCompleted') : t(lang, 'tripCancelled')}</Text><Text style={styles.tripStatusMeta}>{t(lang, 'simulated')}</Text></View>
            {status === 'TRIP_COMPLETED' && booking ? (
              <>
                <Muted>{`${t(lang, 'demoFare')}: ₱${booking.fareDemo}`}</Muted>
                <Muted>{`${t(lang, 'paymentCash')}: ${t(lang, 'paymentCollected')}`}</Muted>
                {state.driver ? <View style={styles.tripIdentity}><Avatar name={state.driver.name} size={42} /><View style={styles.flex}><Text style={styles.driverName}>{state.driver.name}</Text><Muted>{state.driver.todaId} · {t(lang, 'bodyNumber')} {state.driver.bodyNumber}</Muted></View></View> : null}
              </>
            ) : null}
            {status === 'TRIP_CANCELLED' ? (
              <Muted>{t(lang, state.cancelReason === 'NO_DRIVER' ? 'noDriverCancelled' : 'passengerCancelled')}</Muted>
            ) : null}
          </Card>
        ) : null}

      </ScrollView>

      {status !== 'TRIP_STARTED' ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            label={bookingEnded ? t(lang, 'newBooking') : status === 'IDLE' || status === 'LOCATIONS_SELECTED' ? t(lang, 'bookRide') : t(lang, 'cancelBooking')}
            variant={status === 'IDLE' || status === 'LOCATIONS_SELECTED' ? 'success' : bookingEnded ? 'primary' : 'danger'}
            onPress={() => {
              if (status === 'LOCATIONS_SELECTED') confirmBooking();
              else if (bookingEnded) dispatch({ type: 'NEW_BOOKING' });
              else if (status !== 'IDLE') dispatch({ type: 'CANCEL_BOOKING', now: Date.now() });
            }}
            disabled={status === 'IDLE' || (status === 'LOCATIONS_SELECTED' && blockedByCoverage)}
            testID={status === 'IDLE' || status === 'LOCATIONS_SELECTED' ? 'confirm-booking' : 'passenger-primary-action'}
          />
        </View>
      ) : null}

      <Modal visible={historyOpen} animationType="slide" onRequestClose={() => setHistoryOpen(false)}>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Title>{t(lang, 'history')}</Title>
            <Button label={t(lang, 'close')} variant="ghost" compact onPress={() => setHistoryOpen(false)} />
          </View>
          <HistoryList records={state.history} />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function ReviewPanel({ routeSource }: { routeSource: 'road-network' | 'illustrative' | null }) {
  const { state } = useDemoState();
  const { lang } = useDemoControls();
  const { pickup, destination } = state;
  if (!pickup || !destination) return null;
  const straight = haversineKm(pickup.coords, destination.coords);
  return (
    <Card style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Title style={styles.statusTitle}>{t(lang, 'reviewBooking')}</Title>
        <RouteSourceBadge lang={lang} source={routeSource} />
      </View>
      <View style={styles.reviewRow}>
        <Muted>{t(lang, 'distanceEstimate')}</Muted>
        <Text style={styles.reviewValue}>{straight.toFixed(2)} km</Text>
      </View>
      <View style={styles.reviewRow}>
        <Muted>{t(lang, 'demoFare')}</Muted>
        <Text style={styles.reviewValue}>₱{demoFareFor(straight)}</Text>
      </View>
      <Muted>{t(lang, 'fareOnlyDemo')}</Muted>
      <Muted>{t(lang, 'routeSimulated')}</Muted>
      <Title style={styles.paymentTitle}>{t(lang, 'paymentTitle')}</Title>
      <View style={styles.paymentRow}>
        <PaymentChip label={t(lang, 'paymentCash')} selected />
        <PaymentChip label={t(lang, 'paymentGcash')} disabled note={t(lang, 'notInDemo')} />
        <PaymentChip label={t(lang, 'paymentMaya')} disabled note={t(lang, 'notInDemo')} />
      </View>
    </Card>
  );
}

function RideSummary({ state, lang, routeSource, routeDistanceKm }: { state: ReturnType<typeof useDemoState>['state']; lang: 'en' | 'fil'; routeSource: 'road-network' | 'illustrative' | null; routeDistanceKm: number | null }) {
  const straightDistance = state.pickup && state.destination ? haversineKm(state.pickup.coords, state.destination.coords) : null;
  const distance = routeDistanceKm ?? straightDistance;
  const fare = straightDistance === null ? null : demoFareFor(straightDistance);
  const minutes = distance === null ? null : Math.max(1, Math.ceil(distance * 2.9));
  return (
    <Card style={styles.summaryCard} testID="passenger-ride-summary">
      <View style={styles.summaryHeading}>
        <View style={styles.vehicleThumb}><BrandMark size={36} /></View>
        <View style={styles.flex}>
          <Text style={styles.summaryTitle}>JuanTrike</Text>
          <Muted>{t(lang, 'passengerCountDemo')}</Muted>
        </View>
        <View style={styles.fareStack}>
          <Text style={styles.fareValue}>{fare === null ? '—' : `₱${fare}`}</Text>
          <Text style={styles.fareLabel}>{t(lang, 'demoFare')}</Text>
        </View>
      </View>
      <View style={styles.metricRow}>
        <View style={styles.metricTile}>
          <Text style={styles.metricIcon}>◷</Text>
          <View><Text style={styles.metricValue}>{minutes === null ? '—' : `${minutes} min`}</Text><Text style={styles.metricLabel}>{t(lang, 'etaLabel')}</Text></View>
        </View>
        <View style={styles.metricTile}>
          <Text style={styles.metricIcon}>⌁</Text>
          <View><Text style={styles.metricValue}>{distance === null ? '—' : `${distance.toFixed(2)} km`}</Text><Text style={styles.metricLabel}>{t(lang, 'distance')}</Text></View>
        </View>
      </View>
      {routeSource ? <RouteSourceBadge lang={lang} source={routeSource} /> : null}
      <Text style={styles.disclosure}>{fare === null ? t(lang, 'chooseLocationsHint') : t(lang, 'fareOnlyDemo')}</Text>
    </Card>
  );
}

function PaymentChip({
  label,
  selected = false,
  disabled = false,
  note,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <View
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      style={[styles.payChip, selected && styles.payChipSelected, disabled && styles.payChipDisabled]}
    >
      <Text style={[styles.payChipText, selected && styles.payChipTextSelected, disabled && styles.payChipTextDisabled]}>{label}</Text>
      {note ? <Text style={styles.payChipNote}>{note}</Text> : null}
    </View>
  );
}

function LocationRow({
  label,
  selectionHint,
  place,
  zone,
  insideCity,
  active,
  onPress,
  tone,
  lang,
  compact = false,
  testID,
}: {
  label: string;
  selectionHint: string;
  place: Place | null;
  zone: ReturnType<typeof zoneFor>;
  insideCity: boolean;
  active: boolean;
  onPress?: () => void;
  tone: string;
  lang: 'en' | 'fil';
  compact?: boolean;
  testID?: string;
}) {
  const coverage = place
    ? `${zone ? `${t(lang, 'coverageInside')}: ${zone.label}` : t(lang, 'coverageOutside')} · ${t(lang, insideCity ? 'cityBoundaryInsideShort' : 'cityBoundaryOutsideShort')}`
    : null;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${place?.label ?? selectionHint}`}
      accessibilityState={{ disabled: !onPress, selected: active }}
      style={[styles.locRow, active && styles.locRowActive]}
    >
      <View style={[styles.dot, { backgroundColor: tone }]} />
      <View style={styles.flex}>
        <Muted style={compact ? styles.locLabelCompact : undefined}>{label}</Muted>
        <Text style={[styles.locText, compact && styles.locTextCompact]} numberOfLines={1}>
          {place ? place.label : '—'}
        </Text>
        {coverage && !compact ? <Text style={[styles.coverageText, (!zone || !insideCity) && styles.coverageBad]} numberOfLines={2}>{coverage}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Localised GPS notice text, or null when there is nothing to report. */
function gp(status: string, lang: 'en' | 'fil'): string | null {
  switch (status) {
    case 'denied':
      return t(lang, 'gpsDenied');
    case 'services-disabled':
      return t(lang, 'gpsServicesOff');
    case 'timeout':
      return t(lang, 'gpsTimeout');
    case 'stale-fix':
      return t(lang, 'gpsStale');
    case 'invalid-fix':
      return t(lang, 'gpsInvalid');
    case 'error':
      return t(lang, 'gpsError');
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    height: 96,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  centerBrand: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: 0 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  iconText: { fontSize: 20, color: colors.primaryDark, fontWeight: '700' },
  mapWrap: { width: '100%', minHeight: 260, overflow: 'hidden' },
  locationFloat: { position: 'absolute', top: spacing.sm, left: spacing.sm, right: 60, backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 2, gap: 0, elevation: 5, shadowColor: '#0B1B33', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  locationFloatHeader: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', minHeight: 16 },
  serviceAreaTag: { color: colors.successDark, fontSize: 9, fontWeight: '700' },
  locationSwapRow: { height: 28, flexDirection: 'row', alignItems: 'center' },
  swapButton: { minWidth: 32, minHeight: 28, alignItems: 'center', justifyContent: 'center' },
  swapGlyph: { color: colors.textMuted, fontSize: 17, fontWeight: '800' },
  locationFloatActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 22, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 1 },
  locationAction: { minHeight: 32, justifyContent: 'center', paddingHorizontal: spacing.xs },
  locationActionText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
  locationActionDisabled: { opacity: 0.45 },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0B1B33',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.onPrimary },
  floatingRight: { position: 'absolute', right: spacing.md, bottom: spacing.md, gap: spacing.sm, alignItems: 'flex-end' },
  gpsNotice: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    right: 72,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  gpsNoticeText: { color: colors.danger, fontSize: 12 },
  sheet: { flex: 1, minHeight: 0, backgroundColor: colors.background },
  sheetContent: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.background },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 22 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 1, borderRadius: radius.md },
  locRowActive: { backgroundColor: colors.primarySoft, paddingHorizontal: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  locText: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 1 },
  locLabelCompact: { fontSize: 11, lineHeight: 14 },
  locTextCompact: { fontSize: 13, lineHeight: 16, marginTop: 0 },
  coverageText: { fontSize: 10, color: colors.success, marginTop: 1 },
  coverageBad: { color: colors.danger },
  warningCard: { gap: spacing.sm, borderColor: colors.danger, borderWidth: 1 },
  reviewCard: { gap: spacing.sm },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  reviewValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  paymentTitle: { fontSize: 15, marginTop: spacing.sm },
  paymentRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  payChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 96,
  },
  payChipSelected: { borderColor: colors.success, backgroundColor: colors.primarySoft },
  payChipDisabled: { opacity: 0.5 },
  payChipText: { fontSize: 14, fontWeight: '700', color: colors.text },
  payChipTextSelected: { color: colors.primary },
  payChipTextDisabled: { color: colors.textMuted },
  payChipNote: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  splitRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  statusCard: { gap: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusTitle: { fontSize: 17 },
  tripStatusHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, backgroundColor: colors.success, borderRadius: radius.md, paddingHorizontal: spacing.md },
  tripStatusHeaderCancelled: { backgroundColor: colors.danger },
  tripStatusTitle: { color: colors.onPrimary, fontSize: 15, fontWeight: '800', flexShrink: 1 },
  tripStatusMeta: { color: colors.onPrimary, fontSize: 11, fontWeight: '700' },
  tripIdentity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  driverName: { color: colors.text, fontSize: 14, fontWeight: '800' },
  summaryCard: { gap: spacing.xs, borderRadius: radius.xl, padding: spacing.sm },
  summaryHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  vehicleThumb: { width: 44, height: 40, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  fareStack: { alignItems: 'flex-end', maxWidth: '43%' },
  fareValue: { color: colors.primaryDark, fontSize: 16, fontWeight: '900' },
  fareLabel: { color: colors.textMuted, fontSize: 9, textAlign: 'right' },
  metricRow: { flexDirection: 'row', gap: spacing.sm },
  metricTile: { flex: 1, minHeight: 42, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surface },
  metricIcon: { color: colors.primaryDark, fontSize: 19, fontWeight: '700' },
  metricValue: { color: colors.text, fontSize: 13, fontWeight: '800' },
  metricLabel: { color: colors.textMuted, fontSize: 9 },
  disclosure: { color: colors.textMuted, fontSize: 10, lineHeight: 14 },
});

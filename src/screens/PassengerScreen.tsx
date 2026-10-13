import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDemo } from '../booking/DemoContext';
import { isSearching, Place } from '../booking/bookingMachine';
import { DEMO_ZONES, DEMO_POLICY, zoneFor, DemoZone } from '../booking/demoZones';
import { ANGELES_CITY_CENTER, demoFareFor, formatCoords, haversineKm } from '../booking/geo';
import { activeRoute, remainingMetres, remainingSeconds, vehiclePosition } from '../booking/movement';
import { Badge, Button, Card, DemoBanner, Muted, Title } from '../components/Ui';
import { InteractiveMap, MapFocus, MapMarkers } from '../components/MapView';
import { HistoryList } from '../components/HistoryList';
import { useForegroundLocation } from '../location/useForegroundLocation';
import { t, Lang } from '../i18n/strings';
import { colors, radius, spacing } from '../theme/tokens';

type Selecting = 'pickup' | 'destination';

export function PassengerScreen({ onOpenPanel }: { onOpenPanel: () => void }) {
  const { state, dispatch, lang, switchMode, confirmBooking } = useDemo();
  const insets = useSafeAreaInsets();
  const gps = useForegroundLocation();
  const [selecting, setSelecting] = useState<Selecting>('pickup');
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const editable = state.status === 'IDLE' || state.status === 'LOCATIONS_SELECTED';
  // The booking has finished (completed or cancelled) but the map stays locked until New booking.
  const bookingEnded = state.status === 'TRIP_COMPLETED' || state.status === 'TRIP_CANCELLED';
  const fix = gps.fix;

  const pickupZone = state.pickup ? zoneFor(state.pickup.coords) : null;
  const destinationZone = state.destination ? zoneFor(state.destination.coords) : null;
  const outsideCoverage = (state.pickup !== null && pickupZone === null) || (state.destination !== null && destinationZone === null);

  const vehicle = vehiclePosition(state);
  const markers: MapMarkers = useMemo(
    () => ({
      pickup: state.pickup?.coords ?? null,
      destination: state.destination?.coords ?? null,
      current: fix?.coords ?? null,
      vehicle,
    }),
    [state.pickup, state.destination, fix, vehicle],
  );
  const route = useMemo(() => activeRoute(state), [state]);

  const gpsLabel = (simulated: boolean) =>
    simulated ? t(lang, 'gpsEmulator') : t(lang, 'gpsDevice');

  const setPlace = (which: Selecting, place: Place) => {
    dispatch(which === 'pickup' ? { type: 'SET_PICKUP', place } : { type: 'SET_DESTINATION', place });
  };

  const onMapTap = (coords: { latitude: number; longitude: number }) => {
    if (!editable) return;
    const place: Place = { label: formatCoords(coords), coords, source: 'map-tap' };
    setPlace(selecting, place);
    if (selecting === 'pickup' && !state.destination) setSelecting('destination');
  };

  const useCurrentForPickup = async () => {
    const result = fix ?? (await gps.refresh());
    if (!result) return;
    setPlace('pickup', {
      label: [
        result.source === 'last-known' ? t(lang, 'gpsLastKnown') : null,
        result.simulated ? t(lang, 'gpsEmulator') : t(lang, 'gpsDevice'),
      ]
        .filter(Boolean)
        .join(' · '),
      coords: result.coords,
      source: 'gps',
    });
    setFocus({ coords: result.coords, key: Date.now() });
  };

  const recenter = async () => {
    const result = fix ?? (await gps.refresh());
    if (result) setFocus({ coords: result.coords, key: Date.now() });
  };

  const status = state.status;
  const { booking } = state;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <DemoBanner label={t(lang, 'demoBadge')} />
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>{t(lang, 'appName')}</Text>
          <Muted>{t(lang, 'passengerIdentity')}</Muted>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setHistoryOpen(true)} accessibilityRole="button" accessibilityLabel={t(lang, 'history')} style={styles.iconBtn}>
            <Text style={styles.iconText}>≡</Text>
          </Pressable>
          <Button label={t(lang, 'driverMode')} variant="ghost" compact onPress={() => switchMode('passenger', 'driver')} />
        </View>
      </View>

      <View style={styles.mapWrap}>
        <InteractiveMap
          center={ANGELES_CITY_CENTER}
          markers={markers}
          focus={focus}
          onTapCoords={onMapTap}
          zones={DEMO_ZONES}
          route={route}
          loadingLabel={t(lang, 'mapLoading')}
          errorLabel={t(lang, 'mapError')}
          attribution={t(lang, 'mapAttribution')}
        />
        <View style={styles.floatingTop} pointerEvents="box-none">
          <Pressable
            onPress={editable ? () => setSelecting('pickup') : undefined}
            style={[styles.chip, selecting === 'pickup' && editable && styles.chipActive]}
            accessibilityRole="button"
          >
            <Text style={[styles.chipText, selecting === 'pickup' && editable && styles.chipTextActive]}>
              ● {editable
                ? t(lang, selecting === 'pickup' ? 'tapToSetPickup' : 'tapToSetDestination')
                : t(lang, bookingEnded ? 'bookingEnded' : 'mapLocked')}
            </Text>
          </Pressable>
        </View>
        <View style={styles.floatingRight} pointerEvents="box-none">
          <Pressable onPress={recenter} accessibilityRole="button" accessibilityLabel={t(lang, 'recenter')} style={styles.fab}>
            <Text style={styles.fabText}>◎</Text>
          </Pressable>
          <Pressable onPress={onOpenPanel} accessibilityRole="button" accessibilityLabel={t(lang, 'demoPanel')} style={[styles.fab, styles.fabAccent]}>
            <Text style={styles.fabText}>⚙</Text>
          </Pressable>
        </View>
        {gp(gps.status, lang) !== null && (
          <View style={styles.gpsNotice}>
            <Text style={styles.gpsNoticeText}>{gp(gps.status, lang)}</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.locationCard}>
          <LocationRow
            label={t(lang, 'pickup')}
            place={state.pickup}
            zone={pickupZone}
            active={selecting === 'pickup' && editable}
            onPress={editable ? () => setSelecting('pickup') : undefined}
            tone={colors.success}
            lang={lang}
          />
          <View style={styles.divider} />
          <LocationRow
            label={t(lang, 'destination')}
            place={state.destination}
            zone={destinationZone}
            active={selecting === 'destination' && editable}
            onPress={editable ? () => setSelecting('destination') : undefined}
            tone={colors.accent}
            lang={lang}
          />
          <View style={styles.rowActions}>
            <Button
              label={gps.status === 'loading' ? t(lang, 'gpsLoading') : t(lang, 'useCurrentLocation')}
              variant="ghost"
              onPress={useCurrentForPickup}
              disabled={!editable || gps.status === 'loading'}
              style={styles.flexBtn}
            />
            <Button
              label={t(lang, 'clearLocations')}
              variant="ghost"
              onPress={() => dispatch({ type: 'CLEAR_LOCATIONS' })}
              disabled={!editable || (!state.pickup && !state.destination)}
              style={styles.clearBtn}
            />
          </View>
          {fix && (
            <Muted style={styles.gpsLine}>
              {gpsLabel(fix.simulated)} · {formatCoords(fix.coords)}
              {fix.accuracyM !== null ? ` · ${t(lang, 'accuracy')} ±${Math.round(fix.accuracyM)} m` : ''}
            </Muted>
          )}
          <Muted style={styles.gpsLine}>{`${t(lang, 'coverageTitle')} — ${t(lang, 'coverageNote')}`}</Muted>
        </Card>

        {outsideCoverage && editable && (
          <Card style={styles.warningCard}>
            <Badge label={t(lang, 'coverageOutside')} tone="danger" />
            <Muted>{t(lang, 'coverageWarning')}</Muted>
          </Card>
        )}

        {status === 'LOCATIONS_SELECTED' && booking === null && <ReviewPanel />}

        {status === 'SEARCHING_DRIVER' && booking && (
          <Card style={styles.statusCard}>
            <View style={styles.statusRow}>
              <ActivityIndicator color={colors.primary} />
              <View style={styles.flex}>
                <Title style={styles.statusTitle}>{t(lang, 'searching')}</Title>
                <Muted>{t(lang, 'searchingHint')}</Muted>
              </View>
            </View>
            {state.attempts > 0 && (
              <Muted>{`${t(lang, 'offerLabel')} ${state.attempts} ${t(lang, 'ofWord')} ${DEMO_POLICY.MAX_OFFER_ATTEMPTS}`}</Muted>
            )}
            {state.lastOfferOutcome && (
              <Muted>{t(lang, state.lastOfferOutcome === 'DECLINED' ? 'declinedNotice' : 'expiredNotice')}</Muted>
            )}
            <Button label={t(lang, 'cancelBooking')} variant="danger" onPress={() => dispatch({ type: 'CANCEL_BOOKING', now: Date.now() })} />
          </Card>
        )}

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

        {status === 'DRIVER_OFFERED' && state.offer && (
          <Card style={styles.statusCard}>
            <Badge label={t(lang, 'simulated')} tone="accent" />
            <Title style={styles.statusTitle}>{t(lang, 'searching')}</Title>
            <Muted>{`${t(lang, 'offerLabel')} ${state.offer.attempt} ${t(lang, 'ofWord')} ${DEMO_POLICY.MAX_OFFER_ATTEMPTS} · ${t(lang, 'offerExpiresIn')} ${Math.ceil(state.offer.secondsLeft)}${t(lang, 'secondsUnit')}`}</Muted>
            <Button label={t(lang, 'cancelBooking')} variant="danger" onPress={() => dispatch({ type: 'CANCEL_BOOKING', now: Date.now() })} />
          </Card>
        )}

        {(status === 'DRIVER_ACCEPTED' || status === 'DRIVER_ARRIVING' || status === 'DRIVER_ARRIVED' || status === 'TRIP_STARTED') && booking && (
          <Card style={styles.statusCard}>
            <Badge label={t(lang, 'simulated')} tone="accent" />
            <Title style={styles.statusTitle}>
              {status === 'TRIP_STARTED'
                ? t(lang, 'tripStarted')
                : status === 'DRIVER_ARRIVED'
                  ? t(lang, 'driverArrived')
                  : status === 'DRIVER_ARRIVING'
                    ? t(lang, 'driverEnRoute')
                    : t(lang, 'driverAssigned')}
            </Title>
            {state.driver && (
              <Muted>{`${state.driver.name} · ${state.driver.todaId} · ${t(lang, 'bodyNumber')} ${state.driver.bodyNumber}`}</Muted>
            )}
            {status === 'DRIVER_ARRIVING' && (
              <>
                <Muted>{`${t(lang, 'etaSimulated')}: ~${remainingSeconds(state) ?? 0}${t(lang, 'secondsUnit')} · ${t(lang, 'remainingSimulated')}: ${remainingMetres(state) ?? 0} m`}</Muted>
                <ProgressBar value={state.progress} label={t(lang, 'approachProgress')} />
              </>
            )}
            {status === 'TRIP_STARTED' && (
              <>
                <Muted>{`${t(lang, 'remainingSimulated')}: ${remainingMetres(state) ?? 0} m`}</Muted>
                <ProgressBar value={state.progress} label={t(lang, 'tripProgress')} />
              </>
            )}
            {status !== 'TRIP_STARTED' && (
              <Button label={t(lang, 'cancelBooking')} variant="danger" onPress={() => dispatch({ type: 'CANCEL_BOOKING', now: Date.now() })} />
            )}
          </Card>
        )}

        {(status === 'TRIP_COMPLETED' || status === 'TRIP_CANCELLED') && (
          <Card style={styles.statusCard}>
            <Badge label={t(lang, 'simulated')} tone={status === 'TRIP_COMPLETED' ? 'success' : 'danger'} />
            <Title style={styles.statusTitle}>
              {status === 'TRIP_COMPLETED' ? t(lang, 'tripCompleted') : t(lang, 'tripCancelled')}
            </Title>
            {status === 'TRIP_COMPLETED' && booking && (
              <>
                <Muted>{`${t(lang, 'demoFare')}: ₱${booking.fareDemo}`}</Muted>
                <Muted>{`${t(lang, 'paymentCash')}: ${t(lang, 'paymentCollected')}`}</Muted>
              </>
            )}
            {status === 'TRIP_CANCELLED' && (
              <Muted>{t(lang, state.cancelReason === 'NO_DRIVER' ? 'noDriverCancelled' : 'passengerCancelled')}</Muted>
            )}
            <Button label={t(lang, 'newBooking')} onPress={() => dispatch({ type: 'NEW_BOOKING' })} />
          </Card>
        )}

        <Muted style={styles.footnote}>{t(lang, 'notReal')}</Muted>
      </ScrollView>

      {status === 'LOCATIONS_SELECTED' && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            label={t(lang, 'confirmDemoBooking')}
            variant="success"
            onPress={() => confirmBooking()}
            disabled={outsideCoverage}
            testID="confirm-booking"
          />
        </View>
      )}

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

function ReviewPanel() {
  const { state, lang } = useDemo();
  const { pickup, destination } = state;
  if (!pickup || !destination) return null;
  const distance = haversineKm(pickup.coords, destination.coords);
  return (
    <Card style={styles.reviewCard}>
      <Title style={styles.statusTitle}>{t(lang, 'reviewBooking')}</Title>
      <View style={styles.reviewRow}>
        <Muted>{t(lang, 'distanceEstimate')}</Muted>
        <Text style={styles.reviewValue}>{distance.toFixed(2)} km</Text>
      </View>
      <View style={styles.reviewRow}>
        <Muted>{t(lang, 'demoFare')}</Muted>
        <Text style={styles.reviewValue}>₱{demoFareFor(distance)}</Text>
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

function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }} accessibilityLabel={label}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

function LocationRow({
  label,
  place,
  zone,
  active,
  onPress,
  tone,
  lang,
}: {
  label: string;
  place: Place | null;
  zone: DemoZone | null;
  active: boolean;
  onPress?: () => void;
  tone: string;
  lang: Lang;
}) {
  const coverage = place ? (zone ? `${t(lang, 'coverageInside')}: ${zone.label}` : t(lang, 'coverageOutside')) : null;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.locRow, active && styles.locRowActive]}>
      <View style={[styles.dot, { backgroundColor: tone }]} />
      <View style={styles.flex}>
        <Muted>{label}</Muted>
        <Text style={styles.locText} numberOfLines={1}>
          {place ? place.label : '—'}
        </Text>
        {coverage && <Text style={[styles.coverageText, !zone && styles.coverageBad]}>{coverage}</Text>}
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
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  brand: { fontSize: 22, fontWeight: '900', color: colors.primary, letterSpacing: -0.3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  iconText: { fontSize: 20, color: colors.primaryDark, fontWeight: '700' },
  mapWrap: { flex: 1, minHeight: 260 },
  floatingTop: { position: 'absolute', top: spacing.md, left: spacing.md, right: spacing.md, alignItems: 'flex-start' },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.onPrimary },
  floatingRight: { position: 'absolute', right: spacing.md, bottom: spacing.md, gap: spacing.sm },
  fab: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  fabAccent: { backgroundColor: colors.accent },
  fabText: { fontSize: 20, color: colors.text },
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
  sheet: { maxHeight: '48%', backgroundColor: colors.background },
  sheetContent: { padding: spacing.lg, gap: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.background },
  locationCard: { gap: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 22 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  locRowActive: { backgroundColor: colors.primarySoft, paddingHorizontal: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  locText: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 2 },
  coverageText: { fontSize: 12, color: colors.success, marginTop: 2 },
  coverageBad: { color: colors.danger },
  rowActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  flexBtn: { flex: 1, minHeight: 44 },
  clearBtn: { minHeight: 44, paddingHorizontal: spacing.lg },
  gpsLine: { marginTop: spacing.xs },
  warningCard: { gap: spacing.sm, borderColor: colors.danger, borderWidth: 1 },
  reviewCard: { gap: spacing.sm },
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
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden', marginTop: spacing.xs },
  progressFill: { height: 8, backgroundColor: colors.success },
  statusCard: { gap: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusTitle: { fontSize: 17 },
  footnote: { textAlign: 'center', marginTop: spacing.sm },
});

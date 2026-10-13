import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDemo } from '../booking/DemoContext';
import { DEMO_DRIVERS, DEMO_ZONES, zoneFor } from '../booking/demoZones';
import { ANGELES_CITY_CENTER, formatCoords } from '../booking/geo';
import { activeRoute, remainingMetres, remainingSeconds, vehiclePosition } from '../booking/movement';
import { Badge, Button, Card, DemoBanner, Muted, Title } from '../components/Ui';
import { InteractiveMap, MapFocus, MapMarkers } from '../components/MapView';
import { HistoryList } from '../components/HistoryList';
import { useForegroundLocation } from '../location/useForegroundLocation';
import { t } from '../i18n/strings';
import { colors, radius, spacing } from '../theme/tokens';

export function DriverScreen({ onOpenPanel }: { onOpenPanel: () => void }) {
  const { state, dispatch, lang, switchMode, driverOnline, setDriverOnline } = useDemo();
  const insets = useSafeAreaInsets();
  const gps = useForegroundLocation();
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const { status, booking, pickup, destination, offer } = state;

  const vehicle = vehiclePosition(state);
  const markers: MapMarkers = useMemo(
    () => ({
      pickup: booking?.pickup.coords ?? pickup?.coords ?? null,
      destination: booking?.destination.coords ?? destination?.coords ?? null,
      current: gps.fix?.coords ?? null,
      vehicle,
    }),
    [booking, pickup, destination, gps.fix, vehicle],
  );
  const route = useMemo(() => activeRoute(state), [state]);

  const recenter = async () => {
    const result = gps.fix ?? (await gps.refresh());
    if (result) setFocus({ coords: result.coords, key: Date.now() });
  };

  const incoming = status === 'DRIVER_OFFERED' && booking && offer;
  const pickupForQueue = booking?.pickup.coords ?? pickup?.coords ?? null;
  const pickupZone = pickupForQueue ? zoneFor(pickupForQueue) : null;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <DemoBanner label={t(lang, 'demoBadge')} />
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.brand}>{t(lang, 'driverDashboard')}</Text>
          <Muted>{t(lang, 'driverIdentity')}</Muted>
        </View>
        <Button label={t(lang, 'passengerMode')} variant="ghost" compact onPress={() => switchMode('driver', 'passenger')} />
      </View>

      <View style={styles.mapWrap}>
        <InteractiveMap
          center={ANGELES_CITY_CENTER}
          markers={markers}
          focus={focus}
          zones={DEMO_ZONES}
          route={route}
          loadingLabel={t(lang, 'mapLoading')}
          errorLabel={t(lang, 'mapError')}
          attribution={t(lang, 'mapAttribution')}
        />
        <View style={styles.floatingRight} pointerEvents="box-none">
          <Pressable onPress={recenter} accessibilityRole="button" accessibilityLabel={t(lang, 'recenter')} style={styles.fab}>
            <Text style={styles.fabText}>◎</Text>
          </Pressable>
          <Pressable onPress={onOpenPanel} accessibilityRole="button" accessibilityLabel={t(lang, 'demoPanel')} style={[styles.fab, styles.fabAccent]}>
            <Text style={styles.fabText}>⚙</Text>
          </Pressable>
        </View>
        <View style={styles.floatingLeft} pointerEvents="none">
          {gps.fix && (
            <View style={styles.gpsChip}>
              <Text style={styles.gpsChipText}>
                {gps.fix.simulated ? t(lang, 'gpsEmulator') : t(lang, 'gpsDevice')} · {formatCoords(gps.fix.coords)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        {/* Trip history opens directly under the header, so the list is visible without scrolling. */}
        <Button
          label={showHistory ? t(lang, 'close') : t(lang, 'history')}
          variant="ghost"
          onPress={() => setShowHistory((v) => !v)}
        />
        {showHistory && (
          <View style={styles.historyBox}>
            <HistoryList records={state.history} />
          </View>
        )}

        {/* The incoming offer sits at the top so it is visible without scrolling. */}
        {incoming && booking && offer && (
          <Card style={styles.incoming}>
            <Badge label={t(lang, 'incomingBooking')} tone="accent" />
            <View style={styles.actionRow}>
              <Button label={t(lang, 'decline')} variant="danger" onPress={() => dispatch({ type: 'DECLINE_BOOKING' })} style={styles.flex} />
              <Button label={t(lang, 'accept')} variant="success" onPress={() => dispatch({ type: 'ACCEPT_BOOKING', driverName: offer.driver.name })} style={styles.flex} testID="accept-booking" />
            </View>
            <View style={styles.tripRow}>
              <Muted>{t(lang, 'incomingOfferTo')}</Muted>
              <Text style={styles.tripValue}>{offer.driver.name}</Text>
            </View>
            <View style={styles.tripRow}>
              <Muted>{t(lang, 'offerExpiresIn')}</Muted>
              <Text style={styles.countdown}>{`${Math.ceil(offer.secondsLeft)}${t(lang, 'secondsUnit')}`}</Text>
            </View>
            <View style={styles.tripRow}>
              <Muted>{t(lang, 'pickup')}</Muted>
              <Text style={styles.tripValue} numberOfLines={1}>{booking.pickup.label}</Text>
            </View>
            <View style={styles.tripRow}>
              <Muted>{t(lang, 'destination')}</Muted>
              <Text style={styles.tripValue} numberOfLines={1}>{booking.destination.label}</Text>
            </View>
            <View style={styles.tripRow}>
              <Muted>{t(lang, 'distanceEstimate')}</Muted>
              <Text style={styles.tripValue}>{booking.distanceKm.toFixed(2)} km</Text>
            </View>
            <View style={styles.tripRow}>
              <Muted>{t(lang, 'demoFare')}</Muted>
              <Text style={styles.tripValue}>₱{booking.fareDemo}</Text>
            </View>
            <Muted>{t(lang, 'fareOnlyDemo')}</Muted>
          </Card>
        )}

        {(status === 'DRIVER_ACCEPTED' || status === 'DRIVER_ARRIVING' || status === 'DRIVER_ARRIVED' || status === 'TRIP_STARTED') && (
          <Card style={styles.activeCard}>
            <Badge label={t(lang, 'simulated')} tone="accent" />
            <Title>
              {status === 'DRIVER_ACCEPTED' || status === 'DRIVER_ARRIVING'
                ? t(lang, 'driverEnRoute')
                : status === 'DRIVER_ARRIVED'
                  ? t(lang, 'driverArrived')
                  : t(lang, 'tripStarted')}
            </Title>
            {status === 'DRIVER_ARRIVING' && (
              <Muted>{`${t(lang, 'etaSimulated')}: ~${remainingSeconds(state) ?? 0}${t(lang, 'secondsUnit')} · ${t(lang, 'remainingSimulated')}: ${remainingMetres(state) ?? 0} m`}</Muted>
            )}
            {status === 'TRIP_STARTED' && (
              <Muted>{`${t(lang, 'remainingSimulated')}: ${remainingMetres(state) ?? 0} m`}</Muted>
            )}
            {status === 'DRIVER_ACCEPTED' && (
              <Button label={t(lang, 'onTheWay')} onPress={() => dispatch({ type: 'DRIVER_EN_ROUTE' })} />
            )}
            {status === 'DRIVER_ARRIVING' && (
              <Button label={t(lang, 'arrivedAtPickup')} onPress={() => dispatch({ type: 'DRIVER_ARRIVED' })} />
            )}
            {status === 'DRIVER_ARRIVED' && (
              <Button label={t(lang, 'startTrip')} variant="success" onPress={() => dispatch({ type: 'START_TRIP' })} />
            )}
            {status === 'TRIP_STARTED' && (
              <Button label={t(lang, 'completeTrip')} variant="success" onPress={() => dispatch({ type: 'COMPLETE_TRIP', now: Date.now() })} testID="complete-trip" />
            )}
          </Card>
        )}

        {(status === 'TRIP_COMPLETED' || status === 'TRIP_CANCELLED') && (
          <Card style={styles.activeCard}>
            <Badge label={t(lang, 'simulated')} tone={status === 'TRIP_COMPLETED' ? 'success' : 'danger'} />
            <Title>{status === 'TRIP_COMPLETED' ? t(lang, 'tripCompleted') : t(lang, 'tripCancelled')}</Title>
            {status === 'TRIP_COMPLETED' && booking && (
              <Muted>{`${t(lang, 'demoFare')}: ₱${booking.fareDemo} · ${t(lang, 'paymentCollected')}`}</Muted>
            )}
            <Button label={t(lang, 'returnToQueue')} onPress={() => dispatch({ type: 'NEW_BOOKING' })} />
          </Card>
        )}


        <Card style={styles.onlineCard}>
          <View style={styles.flex}>
            <Badge label={driverOnline ? t(lang, 'online') : t(lang, 'offline')} tone={driverOnline ? 'success' : 'muted'} />
            <Muted style={styles.onlineHint}>{t(lang, 'simulated')}</Muted>
          </View>
          <Button
            label={driverOnline ? t(lang, 'offline') : t(lang, 'goOnline')}
            variant={driverOnline ? 'ghost' : 'success'}
            onPress={() => setDriverOnline(!driverOnline)}
            style={styles.onlineBtn}
          />
        </Card>

        <Card style={styles.queueCard}>
          <Title style={styles.queueTitle}>{t(lang, 'queueTitle')}</Title>
          {pickupForQueue === null || pickupZone === null ? (
            <Muted>{t(lang, 'noQueueDrivers')}</Muted>
          ) : (
            DEMO_DRIVERS.map((driver, index) => {
              const eligible = driver.todaId === pickupZone.id;
              return (
                <View key={driver.id} style={styles.queueRow}>
                  <Text style={styles.queuePos}>{index + 1}</Text>
                  <View style={styles.flex}>
                    <Text style={styles.queueName}>{`${driver.name} · ${driver.todaId} · ${t(lang, 'bodyNumber')} ${driver.bodyNumber}`}</Text>
                    <Muted>{eligible ? t(lang, 'queueEligible') : t(lang, 'queueNotEligible')}</Muted>
                  </View>
                </View>
              );
            })
          )}
        </Card>


        {status === 'SEARCHING_DRIVER' && !driverOnline && (
          <Card>
            <Muted>{t(lang, 'offline')}</Muted>
          </Card>
        )}




        <Muted style={styles.footnote}>{t(lang, 'notReal')}</Muted>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  brand: { fontSize: 18, fontWeight: '800', color: colors.primary },
  mapWrap: { flex: 1, minHeight: 240 },
  floatingRight: { position: 'absolute', right: spacing.md, bottom: spacing.md, gap: spacing.sm },
  floatingLeft: { position: 'absolute', left: spacing.md, top: spacing.md },
  gpsChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gpsChipText: { fontSize: 11, color: colors.text, fontWeight: '600' },
  fab: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  fabAccent: { backgroundColor: colors.accent },
  fabText: { fontSize: 20, color: colors.text },
  sheet: { maxHeight: '50%', backgroundColor: colors.background },
  sheetContent: { padding: spacing.lg, gap: spacing.md },
  onlineCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  onlineHint: { marginTop: spacing.xs },
  onlineBtn: { minHeight: 44, paddingHorizontal: spacing.lg },
  queueCard: { gap: spacing.sm },
  queueTitle: { fontSize: 15 },
  queueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  queuePos: { width: 22, textAlign: 'center', fontSize: 15, fontWeight: '800', color: colors.primary },
  queueName: { fontSize: 14, fontWeight: '700', color: colors.text },
  incoming: { gap: spacing.sm, borderColor: colors.accent, borderWidth: 2 },
  tripRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  tripValue: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  countdown: { fontSize: 20, fontWeight: '900', color: colors.danger },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  activeCard: { gap: spacing.sm },
  historyBox: { minHeight: 160, maxHeight: 280 },
  footnote: { textAlign: 'center', marginTop: spacing.sm },
});

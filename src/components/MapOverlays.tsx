import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DemoState, LatLng } from '../booking/bookingMachine';
import { remainingMetres, remainingSeconds, travelledMetres } from '../booking/movement';
import type { RouteResult, RouteSource } from '../booking/router';
import type { Lang } from '../i18n/strings';
import { t } from '../i18n/strings';
import { colors, radius, routeColors, spacing, typography } from '../theme/tokens';
import { Badge, Card, Divider, IconButton, KeyValue, ProgressBar, RouteStepper } from './Ui';

/** Marker that has focus on the map right now, if any. */
export type FocusedMarker =
  | { kind: 'pickup' | 'destination'; coords: LatLng; inside: boolean; zoneLabel: string | null }
  | { kind: 'terminal'; label: string; coords: LatLng; zoneLabel: string | null }
  | null;

const LEGEND_ROWS = ['legendPickup', 'legendDestination', 'legendDriver', 'legendTerminal', 'legendCoverage', 'legendCityBoundary'] as const;
const LEGEND_TONES: Record<string, string> = {
  legendPickup: colors.success,
  legendDestination: colors.accent,
  legendDriver: colors.primary,
  legendTerminal: colors.primaryDeep,
  legendCoverage: '#8794A6',
  legendCityBoundary: '#0E2E63',
};

/** Compact colour key for the map, toggled with a single icon button. */
export function MapLegend({ lang, open, onToggle, compact = false }: { lang: Lang; open: boolean; onToggle: () => void; compact?: boolean }) {
  return (
    <View style={styles.legendWrap}>
      {open ? (
        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>{t(lang, 'mapLegend')}</Text>
          <Divider />
          {LEGEND_ROWS.map((key) => (
            <View key={key} style={styles.legendRow}>
              <View style={[styles.legendSwatch, { backgroundColor: LEGEND_TONES[key] }]} />
              <Text style={styles.legendText} numberOfLines={1}>
                {t(lang, key)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <IconButton glyph="≡" label={t(lang, 'mapLegend')} onPress={onToggle} tone="scrim" size={compact ? 34 : 40} />
    </View>
  );
}

/**
 * Honest label for the geometry on screen. A road route and a fallback path
 * must never look equally certain, so this chip says which one it is.
 */
export function RouteSourceBadge({ lang, source }: { lang: Lang; source: RouteSource | null }) {
  if (!source) return null;
  const road = source === 'road-network';
  return <Badge label={t(lang, road ? 'routeRoad' : 'routeIllustrative')} tone={road ? 'info' : 'accent'} />;
}

/** Which of the three stepper stages (pickup → trip → destination) is current. */
export function stepIndexFor(status: DemoState['status']): number {
  switch (status) {
    case 'TRIP_COMPLETED':
      return 2;
    case 'TRIP_STARTED':
    case 'DRIVER_ARRIVED':
      return 1;
    default:
      return 0;
  }
}

function stageLabelFor(status: DemoState['status'], lang: Lang): string {
  switch (status) {
    case 'DRIVER_ARRIVED':
      return t(lang, 'stageArrived');
    case 'TRIP_STARTED':
      return t(lang, 'stageTrip');
    case 'TRIP_COMPLETED':
      return t(lang, 'stageDone');
    case 'DRIVER_ACCEPTED':
    case 'DRIVER_ARRIVING':
      return t(lang, 'stageApproach');
    default:
      return t(lang, 'stageWaiting');
  }
}

/**
 * Live navigation readout: stage, remaining distance and simulated ETA.
 * Numbers come from the same polyline the map draws, so they cannot disagree.
 */
export function NavPanel({ lang, state, route }: { lang: Lang; state: DemoState; route: RouteResult | null }) {
  const remaining = remainingMetres(state);
  const seconds = remainingSeconds(state);
  const travelled = travelledMetres(state);
  const total = route ? Math.round(route.distanceKm * 1000) : null;
  const progress = total && total > 0 && travelled !== null ? travelled / total : state.progress;
  const steps = [
    { label: t(lang, 'pickup'), tone: colors.success },
    { label: t(lang, 'tripStarted'), tone: colors.primary },
    { label: t(lang, 'destination'), tone: colors.accent },
  ];
  const stepIndex = stepIndexFor(state.status);

  return (
    <Card style={styles.navCard}>
      <View style={styles.navHeader}>
        <Text style={styles.navTitle}>{t(lang, 'navTitle')}</Text>
        <Badge label={stageLabelFor(state.status, lang)} tone="primary" />
      </View>
      <RouteStepper steps={steps} activeIndex={stepIndex} />
      <Divider />
      <KeyValue label={t(lang, 'remainingLabel')} value={remaining !== null ? `${remaining} m` : t(lang, 'unavailable')} />
      <KeyValue label={t(lang, 'etaLabel')} value={seconds !== null ? `~${seconds}${t(lang, 'secondsUnit')}` : t(lang, 'unavailable')} />
      {total !== null ? <KeyValue label={t(lang, 'progressLabel')} value={`${Math.round(progress * 100)}%`} /> : null}
      {total !== null ? <ProgressBar value={progress} label={t(lang, 'progressLabel')} tone={colors.primary} /> : null}
      <View style={styles.navFooter}>
        <RouteSourceBadge lang={lang} source={route?.source ?? null} />
        <Text style={styles.navNote}>{t(lang, 'routeNote')}</Text>
      </View>
    </Card>
  );
}

/** Contextual card shown after a marker is tapped instead of the map background. */
export function MarkerInfoCard({
  lang,
  marker,
  onDismiss,
}: {
  lang: Lang;
  marker: FocusedMarker;
  onDismiss: () => void;
}) {
  if (!marker) return null;
  const title =
    marker.kind === 'terminal'
      ? marker.label
      : marker.kind === 'pickup'
        ? t(lang, 'markerPickupTitle')
        : t(lang, 'markerDestinationTitle');
  const glyph = marker.kind === 'pickup' ? '●' : marker.kind === 'destination' ? '◆' : '⚑';
  return (
    <Card style={styles.markerCard}>
      <View style={styles.markerHeader}>
        <View style={styles.markerTitleRow}>
          <Text style={[styles.markerGlyph, { color: marker.kind === 'pickup' ? colors.success : marker.kind === 'destination' ? colors.accent : colors.primaryDeep }]}>{glyph}</Text>
          <Text style={styles.markerTitle} numberOfLines={1}>{title}</Text>
        </View>
        <IconButton glyph="×" label={t(lang, 'dismissMarker')} onPress={onDismiss} tone="scrim" size={32} />
      </View>
      <Text style={styles.markerCoords}>
        {marker.coords.latitude.toFixed(5)}, {marker.coords.longitude.toFixed(5)}
      </Text>
      <Badge
        label={marker.zoneLabel ? `${t(lang, 'markerInside')} · ${marker.zoneLabel}` : t(lang, 'markerOutside')}
        tone={marker.zoneLabel ? 'success' : 'danger'}
      />
      {marker.kind === 'terminal' ? <Text style={styles.markerNote}>{t(lang, 'terminalNote')}</Text> : null}
      {marker.kind !== 'terminal' ? <Text style={styles.markerNote}>{t(lang, 'markerTapHint')}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  legendWrap: { alignItems: 'flex-end', gap: spacing.sm },
  legendCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 6,
    minWidth: 168,
  },
  legendTitle: { ...typography.micro, color: colors.textFaint },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendSwatch: { width: 14, height: 4, borderRadius: 2 },
  legendText: { ...typography.caption, color: colors.text, flexShrink: 1 },
  navCard: { gap: spacing.sm },
  navHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navTitle: { ...typography.heading, color: colors.text },
  navFooter: { gap: spacing.xs, alignItems: 'flex-start' },
  navNote: { ...typography.caption, color: colors.textFaint },
  markerCard: { gap: spacing.sm },
  markerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  markerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  markerGlyph: { fontSize: 16, fontWeight: '900' },
  markerTitle: { ...typography.subheading, color: colors.text, flexShrink: 1 },
  markerCoords: { ...typography.caption, color: colors.textMuted },
  markerNote: { ...typography.caption, color: colors.textFaint },
});

/** Exported for tests and the driver screen so route styling stays consistent. */
export const routeTint = routeColors;

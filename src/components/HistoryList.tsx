import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { TripRecord } from '../booking/bookingMachine';
import { useDemo } from '../booking/DemoContext';
import { t } from '../i18n/strings';
import { colors, radius, spacing } from '../theme/tokens';
import { Badge, Muted } from './Ui';

/** Local DEMO trip history. Shared by both modes because it lives in DemoContext. */
export function HistoryList({ records }: { records: TripRecord[] }) {
  const { lang } = useDemo();
  if (records.length === 0) {
    return (
      <View style={styles.empty}>
        <Muted>{t(lang, 'noHistory')}</Muted>
      </View>
    );
  }
  // Rendered inside a parent ScrollView, so a plain list avoids nesting a
  // VirtualizedList. Demo history is short, so virtualization is not needed.
  return (
    <View style={styles.list}>
      {records.map((item) => (
        <View key={item.id + item.endedAt} style={styles.row}>
          <View style={styles.rowTop}>
            <Text style={styles.route} numberOfLines={2}>
              {item.pickupLabel} → {item.destinationLabel}
            </Text>
            <Badge
              label={item.outcome === 'COMPLETED' ? t(lang, 'tripCompleted') : t(lang, 'tripCancelled')}
              tone={item.outcome === 'COMPLETED' ? 'success' : 'danger'}
            />
          </View>
          <Muted>
            {`${item.driverName ?? '—'} · ${item.distanceKm.toFixed(2)} km · ${t(lang, 'demoFare')}: ₱${item.fareDemo} · ${new Date(item.endedAt).toLocaleTimeString()}`}
          </Muted>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  route: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
});

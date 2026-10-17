import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { nextAdvanceEvent } from '../booking/bookingMachine';
import { DemoSpeed, useDemoControls, useDemoState } from '../booking/DemoContext';
import { t } from '../i18n/strings';
import { colors, radius, spacing } from '../theme/tokens';
import { Button, Muted, Title } from './Ui';
import { LanguageToggle } from './LanguageToggle';

const SPEEDS: DemoSpeed[] = [1, 2, 4];

/**
 * Presentation controls. Every action goes through the same reducer as normal
 * use, so the panel cannot put the app into a state a user could not reach.
 * SYNTHETIC DEMO ONLY: remove this panel from any production build.
 */
export function DemoPanel({
  visible,
  onClose,
  onSwitchRole,
}: {
  visible: boolean;
  onClose: () => void;
  onSwitchRole?: () => void;
}) {
  const { state, dispatch } = useDemoState();
  const { lang, setLang, mode, switchMode, restoreDemoLocations, runExampleBooking, runOutsideCoverageExample, paused, setPaused, speed, setSpeed } =
    useDemoControls();

  // Closed, the panel renders nothing at all, so it stops subscribing to the
  // booking clock. Only the open panel pays for re-rendering on every tick.
  if (!visible) return null;

  const advance = nextAdvanceEvent(state);
  const offerOpen = state.status === 'DRIVER_OFFERED';
  const cancellable =
    state.status !== 'IDLE' &&
    state.status !== 'LOCATIONS_SELECTED' &&
    state.status !== 'TRIP_STARTED' &&
    state.status !== 'TRIP_COMPLETED' &&
    state.status !== 'TRIP_CANCELLED';

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  const switchRole = () => {
    if (onSwitchRole) {
      onSwitchRole();
      return;
    }
    run(() => switchMode(mode, mode === 'passenger' ? 'driver' : 'passenger'));
  };

  const nextSpeed = () => {
    const index = SPEEDS.indexOf(speed);
    setSpeed(SPEEDS[(index + 1) % SPEEDS.length]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.headerRow}>
            <Title>{t(lang, 'demoPanel')}</Title>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t(lang, 'close')}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <Muted>{`${t(lang, 'demoBadge')} · ${t(lang, 'notReal')}`}</Muted>
          <ScrollView contentContainerStyle={styles.list}>
            {/* Presenter timing controls first: they are used during a live offer, so they must not need scrolling. */}
            {/* Always available: pausing before confirming holds the request, search and offer until resumed. */}
            <Button
              label={paused ? t(lang, 'resumeDemo') : t(lang, 'pauseDemo')}
              variant="ghost"
              onPress={() => setPaused(!paused)}
            />
            <Button
              label={`${t(lang, 'speedLabel')}: ${speed}x`}
              variant="ghost"
              onPress={nextSpeed}
            />
            <Button
              label={t(lang, 'simulateDecline')}
              variant="ghost"
              disabled={!offerOpen}
              onPress={() => run(() => dispatch({ type: 'DECLINE_BOOKING' }))}
            />
            <Button
              label={t(lang, 'simulateExpiry')}
              variant="ghost"
              disabled={!offerOpen}
              onPress={() => run(() => dispatch({ type: 'OFFER_EXPIRED' }))}
            />
            <Button label={t(lang, 'switchRole')} variant="ghost" onPress={switchRole} />
            <Button label={t(lang, 'restoreLocations')} variant="ghost" onPress={() => run(() => restoreDemoLocations())} />
            <Button label={t(lang, 'exampleBooking')} variant="ghost" onPress={() => run(() => runExampleBooking())} />
            <Button label={t(lang, 'simulateOutside')} variant="ghost" onPress={() => run(() => runOutsideCoverageExample())} />
            <Button
              label={t(lang, 'advanceState')}
              variant="ghost"
              disabled={!advance}
              onPress={() => run(() => advance && dispatch(advance))}
            />
            <Button
              label={t(lang, 'simulateCancel')}
              variant="danger"
              disabled={!cancellable}
              onPress={() => run(() => dispatch({ type: 'CANCEL_BOOKING', now: Date.now() }))}
            />
            <Button label={t(lang, 'resetDemo')} variant="danger" onPress={() => run(() => dispatch({ type: 'RESET' }))} />
            <View style={styles.langRow}>
              <Muted>{t(lang, 'language')}</Muted>
              <LanguageToggle lang={lang} onChange={setLang} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '75%',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  close: { fontSize: 20, color: colors.textMuted, padding: spacing.sm },
  list: { gap: spacing.sm, paddingVertical: spacing.md },
  langRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
});

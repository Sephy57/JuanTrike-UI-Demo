import React from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDemoControls } from '../booking/DemoContext';
import { t } from '../i18n/strings';
import { colors, spacing } from '../theme/tokens';
import { Button, Card, Muted, Title } from './Ui';

export function ApplicationInfoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ApplicationInfoContent onClose={onClose} />
    </Modal>
  );
}

export function ApplicationInfoContent({ onClose }: { onClose: () => void }) {
  const { lang } = useDemoControls();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Title>{t(lang, 'aboutTitle')}</Title>
        <Button label={t(lang, 'close')} variant="ghost" compact onPress={onClose} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Title style={styles.intro}>{t(lang, 'aboutIntro')}</Title>
          <Muted>{t(lang, 'aboutTrips')}</Muted>
          <Muted>{t(lang, 'aboutPayments')}</Muted>
          <Muted>{t(lang, 'aboutLocation')}</Muted>
          <Muted>{t(lang, 'aboutCoverage')}</Muted>
          <Muted>{t(lang, 'mapAttribution')}</Muted>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: { padding: spacing.md },
  card: { gap: spacing.md },
  intro: { fontSize: 18 },
});

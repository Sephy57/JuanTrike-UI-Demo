import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDemo } from '../booking/DemoContext';
import { Badge, Button, Muted, Title } from '../components/Ui';
import { LanguageToggle } from '../components/LanguageToggle';
import { t } from '../i18n/strings';
import { colors, radius, spacing } from '../theme/tokens';

/**
 * Mode selection. No login: choosing a mode only sets local state and never
 * calls an authentication service.
 */
export function WelcomeScreen({ onChoose }: { onChoose: (mode: 'passenger' | 'driver') => void }) {
  const { lang, setLang } = useDemo();
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.topRow}>
        <Badge label={t(lang, 'demoBadge')} tone="accent" />
      </View>

      <View style={styles.hero}>
        {/* Official logo asset is pending; the wordmark is plain text, not a logo. */}
        <Text style={styles.wordmark} accessibilityRole="header">{t(lang, 'appName')}</Text>
        <View style={styles.accentBar} />
        <Title style={styles.welcomeTitle}>{t(lang, 'welcomeTitle')}</Title>
        <Muted style={styles.welcomeBody}>{t(lang, 'welcomeBody')}</Muted>
      </View>

      <View style={styles.actions}>
        <View style={styles.langRow}>
          <Muted>{t(lang, 'language')}</Muted>
          <LanguageToggle lang={lang} onChange={setLang} />
        </View>
        <Button
          label={t(lang, 'passengerMode')}
          onPress={() => onChoose('passenger')}
          style={styles.modeBtn}
          testID="mode-passenger"
        />
        <Button
          label={t(lang, 'driverMode')}
          variant="accent"
          onPress={() => onChoose('driver')}
          style={styles.modeBtn}
          testID="mode-driver"
        />
        <Muted style={styles.footnote}>{t(lang, 'notReal')}</Muted>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface, padding: spacing.xl, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hero: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl },
  wordmark: { fontSize: 44, fontWeight: '900', color: colors.primary, letterSpacing: -1 },
  accentBar: { width: 56, height: 6, borderRadius: radius.pill, backgroundColor: colors.accent },
  welcomeTitle: { textAlign: 'center', fontSize: 22, marginTop: spacing.lg },
  welcomeBody: { textAlign: 'center', paddingHorizontal: spacing.md },
  actions: { gap: spacing.md, paddingBottom: spacing.lg },
  modeBtn: { minHeight: 60 },
  footnote: { textAlign: 'center' },
  langRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

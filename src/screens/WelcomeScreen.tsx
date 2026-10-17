import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDemoControls } from '../booking/DemoContext';
import { Button, Muted, Title } from '../components/Ui';
import { LanguageToggle } from '../components/LanguageToggle';
import { BrandLogo } from '../components/BrandLockup';
import { t } from '../i18n/strings';
import { colors, spacing, typography } from '../theme/tokens';

/**
 * Mode selection. No login: choosing a mode only sets local state and never
 * calls an authentication service.
 */
export function WelcomeScreen({ onChoose, onOpenInfo }: { onChoose: (mode: 'passenger' | 'driver') => void; onOpenInfo?: () => void }) {
  const { lang, setLang } = useDemoControls();
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.topRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'aboutApp')} onPress={onOpenInfo} style={styles.aboutButton}>
          <Text style={styles.aboutText}>{t(lang, 'aboutApp')}</Text>
        </Pressable>
        <LanguageToggle lang={lang} onChange={setLang} />
      </View>

      <ScrollView
        testID="welcome-content-scroll"
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.hero}>
          <BrandLogo width={252} height={220} />
          <Text style={styles.tagline}>{t(lang, 'brandTagline')}</Text>
          <Title style={styles.welcomeTitle}>{t(lang, 'welcomeTitle')}</Title>
          <Muted style={styles.welcomeBody}>{t(lang, 'welcomeBody')}</Muted>
        </View>

      </ScrollView>

      <View style={styles.actions}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface, padding: spacing.xl },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aboutButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.sm },
  aboutText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  scrollView: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: spacing.md },
  tagline: { color: colors.successDark, fontSize: 13, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  welcomeTitle: { ...typography.title, textAlign: 'center', fontSize: 22, marginTop: spacing.sm },
  welcomeBody: { textAlign: 'center', paddingHorizontal: spacing.md },
  actions: { gap: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  modeBtn: { minHeight: 60 },
});

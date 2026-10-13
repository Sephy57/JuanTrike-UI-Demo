import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../i18n/strings';
import { colors, radius, spacing } from '../theme/tokens';

export function LanguageToggle({ lang, onChange }: { lang: Lang; onChange: (lang: Lang) => void }) {
  const options: { code: Lang; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'fil', label: 'FIL' },
  ];
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup">
      {options.map((o) => {
        const active = o.code === lang;
        return (
          <Pressable
            key={o.code}
            onPress={() => onChange(o.code)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={[styles.option, active && styles.optionActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  option: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, backgroundColor: colors.surface },
  optionActive: { backgroundColor: colors.primary },
  text: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  textActive: { color: colors.onPrimary },
});

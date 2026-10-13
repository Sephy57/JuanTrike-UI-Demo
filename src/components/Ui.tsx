import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

type Variant = 'primary' | 'success' | 'accent' | 'danger' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  testID,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const palette = BUTTON_PALETTE[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, compact && styles.compactText, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  );
}

const BUTTON_PALETTE: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
  success: { bg: colors.success, fg: colors.onPrimary, border: colors.success },
  accent: { bg: colors.accent, fg: colors.text, border: colors.accent },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.danger },
  ghost: { bg: colors.surface, fg: colors.primary, border: colors.border },
};

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({
  label,
  tone = 'primary',
  style,
}: {
  label: string;
  tone?: 'primary' | 'success' | 'accent' | 'danger' | 'muted';
  style?: StyleProp<ViewStyle>;
}) {
  const map = {
    primary: { bg: colors.primarySoft, fg: colors.primaryDark },
    success: { bg: colors.successSoft, fg: colors.success },
    accent: { bg: colors.accentSoft, fg: '#8A5A00' },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    muted: { bg: colors.background, fg: colors.textMuted },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }, style]}>
      <Text style={[styles.badgeText, { color: map.fg }]}>{label}</Text>
    </View>
  );
}

/** Persistent label shown on every screen so the prototype is never mistaken for a live service. */
export function DemoBanner({ label }: { label: string }) {
  return (
    <View style={styles.demoBanner} accessibilityLabel={label}>
      <Text style={styles.demoBannerText}>{label}</Text>
    </View>
  );
}

export function Title({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  compact: { minHeight: 36, paddingHorizontal: 10, borderRadius: radius.pill },
  compactText: { fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  demoBanner: {
    backgroundColor: colors.accent,
    paddingVertical: 4,
    alignItems: 'center',
  },
  demoBannerText: { color: colors.text, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
});

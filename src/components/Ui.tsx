import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { HIT_TARGET, colors, radius, shadow, spacing, typography } from '../theme/tokens';

type Variant = 'primary' | 'success' | 'accent' | 'danger' | 'ghost' | 'outline';

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
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.45 : pressed ? 0.88 : 1 },
        !compact && shadow.card,
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
  danger: { bg: colors.danger, fg: colors.onPrimary, border: colors.danger },
  ghost: { bg: colors.surface, fg: colors.primary, border: colors.border },
  outline: { bg: 'transparent', fg: colors.primary, border: colors.primary },
};

/** Circular icon control. The glyph is text so it needs no image asset. */
export function IconButton({
  glyph,
  label,
  onPress,
  tone = 'surface',
  size = 44,
  style,
  testID,
}: {
  glyph: string;
  label: string;
  onPress: () => void;
  tone?: 'surface' | 'primary' | 'accent' | 'scrim';
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const palette = ICON_TONES[tone];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: palette.bg, borderColor: palette.border },
        shadow.fab,
        pressed && { transform: [{ scale: 0.94 }] },
        style,
      ]}
    >
      <Text style={[styles.iconGlyph, { color: palette.fg, fontSize: size * 0.42 }]}>{glyph}</Text>
    </Pressable>
  );
}

const ICON_TONES: Record<string, { bg: string; fg: string; border: string }> = {
  surface: { bg: colors.surface, fg: colors.primary, border: colors.border },
  primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
  accent: { bg: colors.accent, fg: colors.text, border: colors.accent },
  scrim: { bg: 'rgba(255,255,255,0.94)', fg: colors.text, border: 'rgba(255,255,255,0.7)' },
};

export function Card({ children, style, tone = 'surface', testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: 'surface' | 'tint' | 'outline'; testID?: string }) {
  return <View testID={testID} style={[styles.card, tone === 'tint' && styles.cardTint, tone === 'outline' && styles.cardOutline, shadow.card, style]}>{children}</View>;
}

export function Badge({
  label,
  tone = 'primary',
  style,
}: {
  label: string;
  tone?: 'primary' | 'success' | 'accent' | 'danger' | 'muted' | 'info';
  style?: StyleProp<ViewStyle>;
}) {
  const map = {
    primary: { bg: colors.primarySoft, fg: colors.primaryDark },
    success: { bg: colors.successSoft, fg: colors.successDark },
    accent: { bg: colors.accentSoft, fg: colors.accentDark },
    danger: { bg: colors.dangerSoft, fg: colors.dangerDark },
    muted: { bg: colors.backgroundDeep, fg: colors.textMuted },
    info: { bg: colors.infoSoft, fg: colors.info },
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

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

/** label above value, right-aligned value — the standard readout row. */
export function KeyValue({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.kvRow} accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={[styles.kvValue, tone ? { color: tone } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export interface SegmentedOption {
  key: string;
  label: string;
  tone?: string;
}

/** Two or three-way switch. Used for pickup/destination selection. */
export function SegmentedControl({
  options,
  value,
  onChange,
  disabled = false,
  testID,
}: {
  options: SegmentedOption[];
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.segmented} testID={testID} accessibilityRole="tablist">
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active, disabled }}
            disabled={disabled}
            onPress={() => onChange(opt.key)}
            style={({ pressed }) => [
              styles.segment,
              active && { backgroundColor: opt.tone ?? colors.primary, borderColor: opt.tone ?? colors.primary },
              pressed && !active && { backgroundColor: colors.surfaceAlt },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.segmentText, active && styles.segmentTextActive]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Attractive empty state: glyph, headline, explanation. */
export function EmptyState({ glyph, title, body }: { glyph: string; title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyGlyphWrap}>
        <Text style={styles.emptyGlyph}>{glyph}</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Muted style={styles.emptyBody}>{body}</Muted> : null}
    </View>
  );
}

/** Indeterminate shimmer used while the map or a panel is loading. */
export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: number | string; style?: StyleProp<ViewStyle> }) {
  // Created once via a lazy initialiser rather than a ref, because the value is
  // read during render (to build the animated style), which refs must not be.
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.skeleton, { height, width: width as ViewStyle['width'], opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] }) }, style]}
    />
  );
}

/** Initials avatar. Synthetic identity only — no photo, no third-party service. */
export function Avatar({ name, size = 40, tone }: { name: string; size?: number; tone?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: tone ?? colors.primary },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

export function Chip({
  label,
  tone = 'muted',
  glyph,
  style,
}: {
  label: string;
  tone?: 'primary' | 'success' | 'danger' | 'accent' | 'muted' | 'info';
  glyph?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const map = {
    primary: { bg: colors.primarySoft, fg: colors.primaryDark, border: colors.primarySoft },
    success: { bg: colors.successSoft, fg: colors.successDark, border: colors.successSoft },
    danger: { bg: colors.dangerSoft, fg: colors.dangerDark, border: colors.dangerSoft },
    accent: { bg: colors.accentSoft, fg: colors.accentDark, border: colors.accentSoft },
    muted: { bg: colors.surface, fg: colors.textMuted, border: colors.border },
    info: { bg: colors.infoSoft, fg: colors.info, border: colors.infoSoft },
  }[tone];
  return (
    <View style={[styles.chip, { backgroundColor: map.bg, borderColor: map.border }, style]}>
      {glyph ? <Text style={[styles.chipGlyph, { color: map.fg }]}>{glyph}</Text> : null}
      <Text style={[styles.chipText, { color: map.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Horizontal progress bar with an accessible percentage. */
export function ProgressBar({ value, label, tone = colors.success }: { value: number; label: string; tone?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }} accessibilityLabel={label}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: tone }]} />
      </View>
    </View>
  );
}

/**
 * Three-step route indicator (pickup → trip → destination). Pure views, so it
 * stays cheap inside the render path that runs on every simulation tick.
 */
export function RouteStepper({
  steps,
  activeIndex,
}: {
  steps: { label: string; tone?: string }[];
  activeIndex: number;
}) {
  return (
    <View style={styles.stepper} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: steps.length - 1, now: activeIndex }}>
      {steps.map((step, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        const tone = step.tone ?? colors.primary;
        return (
          <React.Fragment key={step.label}>
            {i > 0 ? <View style={[styles.stepperLine, done || active ? { backgroundColor: tone } : null]} /> : null}
            <View style={styles.stepperItem}>
              <View
                style={[
                  styles.stepperDot,
                  { borderColor: tone },
                  (done || active) && { backgroundColor: tone },
                ]}
              >
                <Text style={[styles.stepperDotText, (done || active) && { color: colors.onPrimary }]}>{i + 1}</Text>
              </View>
              <Text numberOfLines={1} style={[styles.stepperLabel, active && { color: colors.text }]} ellipsizeMode="tail">
                {step.label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

/** Bottom sheet surface with a grab handle. Layout only — the parent positions it. */
export function SheetSurface({
  children,
  style,
  handleLabel,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  handleLabel?: string;
}) {
  return (
    <View style={[styles.sheet, shadow.sheet, style]}>
      <View accessibilityLabel={handleLabel} style={styles.sheetHandleWrap} pointerEvents="none">
        <View style={styles.sheetHandle} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  compact: { minHeight: 38, paddingHorizontal: 12, borderRadius: radius.pill },
  compactText: { fontSize: 13 },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minWidth: HIT_TARGET,
    minHeight: HIT_TARGET,
  },
  iconGlyph: { fontWeight: '800' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTint: { backgroundColor: colors.primaryTint, borderColor: colors.primarySoft },
  cardOutline: { backgroundColor: colors.surface, borderColor: colors.primary },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  demoBanner: { backgroundColor: colors.accent, paddingVertical: 4, alignItems: 'center' },
  demoBannerText: { color: colors.text, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { ...typography.title, color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  sectionTitle: { ...typography.micro, color: colors.textFaint, textTransform: 'uppercase' },
  kvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.xs },
  kvLabel: { ...typography.label, color: colors.textMuted, flexShrink: 1 },
  kvValue: { ...typography.subheading, color: colors.text, flexShrink: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: colors.border },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundDeep,
    borderRadius: radius.pill,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  segmentText: { ...typography.label, color: colors.textMuted },
  segmentTextActive: { color: colors.onPrimary },
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyGlyphWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyGlyph: { fontSize: 28, color: colors.primary },
  emptyTitle: { ...typography.subheading, color: colors.text, textAlign: 'center' },
  emptyBody: { textAlign: 'center', paddingHorizontal: spacing.lg },
  skeleton: { backgroundColor: colors.backgroundDeep, borderRadius: radius.sm },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.onPrimary, fontWeight: '800' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipGlyph: { fontSize: 12, fontWeight: '900' },
  chipText: { ...typography.caption, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.backgroundDeep, overflow: 'hidden', marginTop: spacing.xs },
  progressFill: { height: 8, borderRadius: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperItem: { alignItems: 'center', gap: 4, flexShrink: 1 },
  stepperDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepperDotText: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
  stepperLabel: { ...typography.caption, color: colors.textFaint, maxWidth: 92 },
  stepperLine: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: -6, marginBottom: 18 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sheetHandleWrap: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.xs },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong },
});

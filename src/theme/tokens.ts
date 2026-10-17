// Design tokens for JuanTrike.
//
// One source of truth for colour, spacing, radius, elevation and type so every
// screen reads as the same product. Values are plain objects (no rem/px
// conversion helpers) because React Native styles are resolved once at module
// load — cheap enough to stay off the render path.

/** Green = brand/actions, blue = navigation, amber = attention, red = destructive. */
export const colors = {
  primary: '#119C58',
  primaryDark: '#0D7543',
  primaryDeep: '#15365F',
  primarySoft: '#E5F5EC',
  primaryTint: '#F3FBF6',
  success: '#119C58',
  successDark: '#0D7543',
  successSoft: '#E5F5EC',
  accent: '#F2A900',
  accentDark: '#8A5A00',
  accentSoft: '#FFF4D6',
  danger: '#D6453D',
  dangerDark: '#A9322B',
  dangerSoft: '#FBE7E5',
  info: '#1F5FBF',
  infoSoft: '#E6EEFA',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFD',
  background: '#F3F5F9',
  backgroundDeep: '#E9EEF5',
  border: '#DCE2EC',
  borderStrong: '#C3CDDD',
  text: '#15202F',
  textMuted: '#5B6778',
  textFaint: '#8794A6',
  onPrimary: '#FFFFFF',
  scrim: 'rgba(15,23,42,0.45)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 } as const;

/** Android uses `elevation`, iOS uses shadow* — always set both. */
export const shadow = {
  none: { shadowColor: 'transparent', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  card: {
    shadowColor: '#0B1B33',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sheet: {
    shadowColor: '#0B1B33',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  fab: {
    shadowColor: '#0B1B33',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
} as const;

/** Type ramp. System font; weight carries the hierarchy, not a custom family. */
export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '900', letterSpacing: -0.8 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.4 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '800', letterSpacing: -0.2 },
  subheading: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.6 },
} as const;

/** Minimum touch target. Never ship a control smaller than this. */
export const HIT_TARGET = 44;

/** Route colours. Chosen to stay distinguishable for common colour vision deficiencies. */
export const routeColors = {
  preview: '#2474D2',
  approach: '#F2A900',
  trip: '#2474D2',
  traveled: '#9AA7BD',
} as const;

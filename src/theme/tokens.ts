// Colour and spacing tokens. Blue = primary, green = success, amber = navigation accents.
export const colors = {
  primary: '#1F5FBF',
  primaryDark: '#16479A',
  primarySoft: '#E6EEFA',
  success: '#1E9E5A',
  successSoft: '#E4F6EC',
  accent: '#F2A900',
  accentSoft: '#FFF4D6',
  danger: '#D6453D',
  dangerSoft: '#FBE7E5',
  surface: '#FFFFFF',
  background: '#F3F5F9',
  border: '#DCE2EC',
  text: '#15202F',
  textMuted: '#5B6778',
  onPrimary: '#FFFFFF',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { md: 12, lg: 18, pill: 999 } as const;

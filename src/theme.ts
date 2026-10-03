export const colors = {
  signal: '#2F6BFF',
  deep: '#1746B7',
  violet: '#7657FF',
  ink: '#101828',
  resolved: '#24B47E',
  greySpot: '#697586',
  background: '#F7F9FC',
  surface: '#FFFFFF',
  border: '#DDE3EA',
  muted: '#667085',
  warning: '#C67A00',
  error: '#C6384A',
  blueSoft: '#EEF3FF',
  violetSoft: '#F2EEFF',
  mintSoft: '#E7F8F1',
  greySoft: '#EEF1F4',
} as const;

export const fonts = {
  heading: 'Manrope_700Bold',
  headingExtra: 'Manrope_800ExtraBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_700Bold',
} as const;

export const shadow = {
  shadowColor: colors.ink,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 24,
  elevation: 5,
} as const;

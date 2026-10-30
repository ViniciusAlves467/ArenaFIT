/**
 * Design tokens do ArenaFit — "clean, preto e laranja".
 * Preto quase puro para fundo, superfícies em camadas de cinza neutro e um único
 * laranja de destaque. O laranja é reservado para ação primária e progresso; o resto
 * da interface fica em tons neutros para que ele tenha peso.
 */
export const colors = {
  bg: '#0A0A0A',
  surface: '#131313',
  surface2: '#1A1A1A',
  surface3: '#242424',
  border: '#232323',
  borderStrong: '#333333',

  text: '#F5F5F4',
  textSecondary: '#A1A1A1',
  textMuted: '#6E6E6E',

  primary: '#FF6A13',
  primaryPressed: '#E25A08',
  primarySoft: 'rgba(255, 106, 19, 0.14)',
  primaryBorder: 'rgba(255, 106, 19, 0.35)',
  onPrimary: '#0A0A0A',

  success: '#4ADE80',
  successSoft: 'rgba(74, 222, 128, 0.12)',
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.12)',
  warning: '#FBBF24',

  gold: '#E8B04B',
  silver: '#C3C7CE',
  bronze: '#C7834A',

  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

/** Cores de destaque que o usuário pode escolher no avatar — todas harmonizam com o laranja. */
export const avatarAccents = ['#FF6A13', '#FF8A3D', '#FFB547', '#F43F5E', '#E5E5E5', '#8A8F98'] as const;

export const rarityColor: Record<string, string> = {
  common: colors.textSecondary,
  rare: '#FF8A3D',
  epic: colors.primary,
  legendary: colors.gold,
};

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  /** Números, placares e títulos de destaque. */
  display: 'BarlowCondensed_700Bold',
  displaySemi: 'BarlowCondensed_600SemiBold',
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 44, lineHeight: 46, letterSpacing: 0.5 },
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: 0.4 },
  stat: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, letterSpacing: 0.3 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase' as const },
} as const;

export type TypeVariant = keyof typeof type;

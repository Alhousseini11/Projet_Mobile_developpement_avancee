/**
 * App Theme and Style Constants
 * Centralized color and styling configuration
 */

/**
 * Color Palette
 */
export const colors = {
  // Primary
  primary: '#dc2626', // Red for main actions
  primaryDark: '#b91c1c',
  primaryLight: '#fee2e2',

  // Backgrounds
  bgPrimary: '#111827', // Very dark gray
  bgSecondary: '#1f2937', // Dark gray
  bgTertiary: '#374151', // Medium gray

  // Text
  textPrimary: '#ffffff', // White
  textSecondary: '#d1d5db', // Light gray
  textTertiary: '#9ca3af', // Medium gray
  textMuted: '#6b7280', // Muted gray

  // Semantic
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Additional
  accent: '#ca8a04', // Yellow
  accentBlue: '#3b82f6',
  accentGreen: '#10b981',
  accentPurple: '#a855f7',
}

/**
 * Vehicle type border colors
 */
export const vehicleTypeColors = {
  sedan: colors.primary,
  suv: colors.accent,
  truck: colors.accentBlue,
  minivan: colors.accentPurple,
  coupe: colors.accentGreen,
  other: colors.accentPurple,
}

/**
 * Spacing scale
 */
export const spacing = {
  xs: '4',
  sm: '8',
  md: '12',
  lg: '16',
  xl: '24',
  xxl: '32',
}

/**
 * Border radius values
 */
export const borderRadius = {
  none: '0',
  sm: '4',
  md: '8',
  lg: '12',
  full: '999',
}

/**
 * Font sizes
 */
export const fontSize = {
  xs: '12',
  sm: '14',
  base: '16',
  lg: '18',
  xl: '20',
  '2xl': '24',
  '3xl': '30',
  '4xl': '36',
}

/**
 * Shadows (CSS box-shadow values as examples)
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
}

/**
 * Animation durations (in ms)
 */
export const animations = {
  fast: 150,
  normal: 300,
  slow: 500,
}

/**
 * CSS Class shortcuts for common styles
 */
export const styleClasses = {
  // Backgrounds
  'bg-primary': `background-color: ${colors.primary}`,
  'bg-secondary': `background-color: ${colors.bgSecondary}`,
  'bg-dark': `background-color: ${colors.bgPrimary}`,

  // Text colors
  'text-white': `color: ${colors.textPrimary}`,
  'text-gray': `color: ${colors.textSecondary}`,
  'text-muted': `color: ${colors.textMuted}`,
  'text-primary': `color: ${colors.primary}`,

  // Common layouts
  'flex-center': 'justify-content: center; align-items: center;',
  'flex-between': 'justify-content: space-between; align-items: center;',
}

/**
 * Theme configuration object for use in Vue components
 */
export const theme = {
  colors,
  vehicleTypeColors,
  spacing,
  borderRadius,
  fontSize,
  animations,
}

export default theme

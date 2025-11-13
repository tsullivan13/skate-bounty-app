// constants/theme.ts
import { Platform, TextStyle } from 'react-native';

export const palette = {
  bg: '#0B0D10',
  card: '#151922',
  cardElevated: '#171C26',
  text: '#E6EAF2',
  textMuted: '#98A2B3',
  primary: '#6EE7B7', // mint
  primaryTextOn: '#0B0D10',
  outline: '#232A36',
  subtle: '#0E131B',
  accent: '#60A5FA',
  danger: '#F87171',
  warning: '#F59E0B',
};

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const space = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
};

export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 6 },
    default: {},
  }),
};

// Explicitly type each style as TextStyle so fontWeight stays a literal (e.g. '800') not widened to string
const title: TextStyle = { fontSize: 22, fontWeight: '800', letterSpacing: 0.2, color: palette.text };
const h2: TextStyle = { fontSize: 18, fontWeight: '700', color: palette.text };
const body: TextStyle = { fontSize: 16, color: palette.text };
const small: TextStyle = { fontSize: 12, color: palette.textMuted };
const pill: TextStyle = { fontSize: 12, fontWeight: '700', color: palette.text };
const button: TextStyle = { fontSize: 16, fontWeight: '800', letterSpacing: 0.25, color: palette.primaryTextOn };
const code: TextStyle = {
  fontFamily: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
  color: palette.text,
};

export const type = { title, h2, body, small, pill, button, code };

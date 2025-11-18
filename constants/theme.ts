// constants/theme.ts
import { Platform, TextStyle } from 'react-native';

export const palette = {
  bg: '#04060C',
  card: '#0C1320',
  cardElevated: '#101A2A',
  text: '#EAF0FB',
  textMuted: '#9FB2D0',
  primary: '#7CE7C0', // mint
  primaryTextOn: '#041019',
  outline: '#1A2435',
  subtle: '#0A111E',
  accent: '#7FB4FF',
  danger: '#FF7B7B',
  warning: '#F6C160',
  surfaceGlow: '#132033',
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
  md: 16,
  lg: 20,
  xl: 28,
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
const title: TextStyle = { fontSize: 24, fontWeight: '800', letterSpacing: 0.4, color: palette.text };
const h2: TextStyle = { fontSize: 18, fontWeight: '700', color: palette.text };
const body: TextStyle = { fontSize: 16, color: palette.text };
const small: TextStyle = { fontSize: 13, color: palette.textMuted };
const pill: TextStyle = { fontSize: 12, fontWeight: '700', color: palette.text };
const button: TextStyle = { fontSize: 16, fontWeight: '800', letterSpacing: 0.35, color: palette.primaryTextOn };
const code: TextStyle = {
  fontFamily: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
  color: palette.text,
};

export const type = { title, h2, body, small, pill, button, code };
